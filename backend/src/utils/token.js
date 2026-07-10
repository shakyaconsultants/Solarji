const jwt = require('jsonwebtoken');

function signUserToken(user) {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      points: user.points ?? 0,
      handlesComplaints: Boolean(user.handlesComplaints),
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function tokenPayloadForUser(user) {
  const token = signUserToken(user);
  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      points: user.points ?? 0,
      handlesComplaints: Boolean(user.handlesComplaints),
    },
  };
}

module.exports = { signUserToken, tokenPayloadForUser };
