const { handleLeadRequest } = require("./_lead-handler");

module.exports = async function leads(req, res) {
  const response = await handleLeadRequest({
    method: req.method,
    headers: req.headers,
    body: req.body,
    ip: req.socket?.remoteAddress || "",
    nodeRequest: req,
  });

  Object.entries(response.headers || {}).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.status(response.statusCode).send(response.body);
};
