export function notFound(req, res) { res.status(404).json({ message: `No route for ${req.method} ${req.path}` }); }
export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error.code === 11000) return res.status(409).json({ message: 'That email, student roll number, or employee ID is already registered.' });
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Images must be 5 MB or smaller and videos 50 MB or smaller.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: error.message });
  const status = error.status || error.statusCode;
  res.status(status || 500).json({ message: status ? error.message : 'Something went wrong. Please try again.' });
}
