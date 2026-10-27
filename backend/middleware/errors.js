export function notFound(req, res) { res.status(404).json({ message: `No route for ${req.method} ${req.path}` }); }
export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: error.message });
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Something went wrong. Please try again.' });
}
