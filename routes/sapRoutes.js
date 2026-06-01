import express from "express";
const router = express.Router();

router.get("/business-partner", async (req, res) => {
  const search = req.query.search;

  const response = await fetch(
    `http://localhost/sap-proxy/...${search}`
  );

 const text = await response.text();

console.log(
  "RAW RESPONSE:",
  text
);

let data = {};

try {

  data = JSON.parse(text);

} catch (err) {

  console.error(
    "NOT JSON RESPONSE"
  );

  return res.status(500).json({
    error:
      "Innovation Hub returned non JSON response",
    raw: text.substring(0, 500),
  });

}
  res.json(data);
});

export default router;