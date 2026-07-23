const { v2: cloudinary } = require('cloudinary');
console.log('Before config:', cloudinary.config());

process.env.CLOUDINARY_URL = 'cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz@my_cloud_name';

console.log('After env set:', cloudinary.config());
