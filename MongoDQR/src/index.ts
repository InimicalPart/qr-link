import express from 'express';
import cors from 'cors';
import yaml from 'yaml'
import { config } from 'dotenv';
config()
const app = express();
app.use(cors());
app.use(express.json());

app.get('/test', (_req, res) => {
  res.send({
    test: "complete"
  });
});

app.get("/mongodb/config", (_req, res) => {
    const fs = require('fs');
    const config = yaml.parse(fs.readFileSync('/data/configdb/mongod.conf', 'utf8'));
    res.send(config);
})

app.post("/mongodb/config", (req, res) => {
    const fs = require('fs');
    fs.writeFileSync('/data/configdb/mongod.conf', yaml.stringify(req.body));
    res.send({
        status: "success"
    });
})

app.post("/mongodb/restart", (_req, res) => {
    const { exec } = require('child_process');
    exec('supervisorctl restart mongod', (err) => {
        if (err) {
            console.error(err);
            return res.send({
                status: "error",
                message: err.message
            });
        }
        res.send({
            status: "success"
        });
    });
})
if (!process.env.IS_DOCKER) {
    console.log("WARNING! For security reasons, this program is only intended to be run in a docker container. Please run this program in a docker container.")
    process.exit(1);
}

app.listen(3010, () => {
  console.log('MDB API Server is running on port 3010');
});
