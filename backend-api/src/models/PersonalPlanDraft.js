const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    slot: {type:Number,min:0,max:29,validate:Number.isInteger},
    fields: {
      title: { type: String, maxlength: 100 },
      description: { type: String, maxlength: 2000 },
      date: String,
      time: String,
      timeZone: String,
      address: { type: String, maxlength: 200 },
      city: { type: String, maxlength: 100 },
      country: { type: String, maxlength: 100 },
      currency: { type: String, enum: ['DOP', 'USD', 'EUR', 'MXN'] },
      amount: { type: Number, min: 0, max: 1000000 },
    },
  },
  { timestamps: true },
);
schema.index({ owner: 1, updatedAt: -1 });
schema.index({owner:1,slot:1},{unique:true,partialFilterExpression:{slot:{$type:'number'}}});
module.exports =
  mongoose.models.PersonalPlanDraft ||
  mongoose.model('PersonalPlanDraft', schema);
