const app = require("./index").app;
const debug = require("debug")("turn:opensrp");

const port = process.env.PORT || 3000;

app.listen(port, () => debug(`Example app listening on port ${port}!`));
