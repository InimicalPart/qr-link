import express from 'express';
import cors from 'cors';
import yaml from 'yaml'
import { config } from 'dotenv';
import fs from 'fs';
import { exec } from 'child_process';
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
    const config = yaml.parse(fs.readFileSync('/data/configdb/mongod.conf', 'utf8'));
    res.send(config);
})

app.post("/mongodb/config", (req, res) => {
    fs.writeFileSync('/data/configdb/mongod.conf', yaml.stringify(req.body));
    res.send({
        status: "success"
    });
})

app.post("/mongodb/restart", (_req, res) => {
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
