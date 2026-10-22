const mongoose = require('mongoose');
const multer = require('multer');
const sharp = require('sharp');
const { finished } = require('stream/promises');
const rateLimit = require('express-rate-limit');

const memoryUploadLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30,
  keyGenerator: req => String(req.user._id), standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Puedes subir hasta 30 fotos por hora. Inténtalo más tarde.' } });

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'privateMemories' });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1, fieldSize: 2000, parts: 3 },
  fileFilter: (req, file, done) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    done(allowed ? null : new Error('Selecciona una foto JPEG, PNG o WebP'), allowed);
  }
}).single('memoryImage');

function receiveMemoryImage(req, res, next) {
  upload(req, res, error => {
    if (!error) return next();
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({ success: false,
      message: tooLarge ? 'La foto no debe superar los 10 MB' : 'Envía una sola foto JPEG, PNG o WebP y su comentario' });
  });
}

async function storeMemoryImage(buffer, eventId, memoryId) {
  let image;
  try {
    const input = sharp(buffer, { limitInputPixels: 20000000, failOn: 'error' });
    const metadata = await input.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Unsupported image');
    // Re-encode the pixels; original filenames, EXIF/GPS and extra payloads
    // never become part of the stored private JPEG.
    image = await input.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 }).toBuffer();
  } catch (_) {
    const error = new Error('La foto está dañada o no es una imagen JPEG, PNG o WebP válida');
    error.status = 400;
    throw error;
  }
  const stream = bucket().openUploadStream(`${memoryId}.jpg`, {
    metadata: { eventId: String(eventId), memoryId: String(memoryId), contentType: 'image/jpeg' }
  });
  try {
    const complete = finished(stream);
    stream.end(image);
    await complete;
    return stream.id;
  } catch (error) {
    await bucket().delete(stream.id).catch(() => {});
    throw error;
  }
}

async function findMemoryImage(assetId, eventId, memoryId) {
  return bucket().find({ _id: assetId, 'metadata.eventId': String(eventId), 'metadata.memoryId': String(memoryId) }).next();
}
const openMemoryImage = assetId => bucket().openDownloadStream(assetId);
const deleteMemoryImage = assetId => bucket().delete(assetId);

function serializeMemory(memory, userId) {
  const data = memory.toObject ? memory.toObject() : { ...memory };
  const imagePath = data.imageAssetId ? `/events/${data.event}/memories/${data._id}/image` : '';
  delete data.imageAssetId;
  delete data.reports;
  return { ...data, imageUrl: imagePath, imageUnavailable: !imagePath,
    likesCount: (data.likes || []).length,
    hasLiked: (data.likes || []).some(id => String(id) === String(userId)),
    isOwner: String(data.user?._id || data.user) === String(userId) };
}

module.exports = { memoryUploadLimit, receiveMemoryImage, storeMemoryImage, findMemoryImage, openMemoryImage, deleteMemoryImage, serializeMemory };
