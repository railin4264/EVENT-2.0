const mongoose = require('mongoose');
// One bounded document per owner makes the 20-slot quota atomic across replicas.
const slot = new mongoose.Schema({ key: String, data: mongoose.Schema.Types.Mixed, version: String, updatedAt: Date }, { _id: false });
const schema = new mongoose.Schema({ _id: mongoose.Schema.Types.ObjectId, slots: [slot] }, { versionKey: false });
module.exports = mongoose.models.UserWorkspace || mongoose.model('UserWorkspace', schema);
