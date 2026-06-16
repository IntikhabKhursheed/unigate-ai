function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.status(statusCode).json(payload);
}

function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.status(204).end();
    return true;
  }

  return false;
}

module.exports = {
  handleOptions,
  sendJson,
  setCorsHeaders,
};
