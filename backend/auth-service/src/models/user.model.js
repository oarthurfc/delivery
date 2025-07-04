const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const Counter = require('./counter.model');

const userSchema = new mongoose.Schema({
  _id: {
    type: Number
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false // Não retorna a senha nas consultas por padrão
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['customer', 'driver'],
    default: 'customer'
  },
  fcmToken: {
    type: String,
    required: true,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Adiciona createdAt e updatedAt
});

// Auto-incrementar ID numérico
userSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'userId' }, 
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true }
      );
      this._id = counter.seq;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, config.saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para transformar o documento antes de JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  user.id = user._id; // Garantir que o id também esteja disponível no formato simples
  delete user.password; // Nunca enviar a senha, mesmo que já esteja select: false
  return user;
};

// Método para comparar senha
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);
