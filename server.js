const express = require("express");
//Cors - can go later
const cors = require("cors");
const app = express();

//Cors - can go later
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/", (req, res) => {
  console.log("POST received:", req.body);
  console.log(req.body.data + " <-- Send this somewhere");
  res.send("Thanks for the Post: " + req.body.data);
});

app.get("/", (req, res) => {
  console.log("GET received");
  res.send("Hello from the FactoryPi");
});

app.listen(3000, () => console.log("Server running on port 3000"));
