import jwt from 'jsonwebtoken';

// Test the JWT signing
const token = jwt.sign(
  { userId: '123', type: 'access' },
  'secret',
  { expiresIn: '15m' }
);

console.log('Token:', token);

// Test verification
const decoded = jwt.verify(token, 'secret');
console.log('Decoded:', decoded);
