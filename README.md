# [TYPE](https://github.com/yakunyue/type)
## 汉字打字游戏

基于[cnchar](https://github.com/theajack/cnchar)的拼音打字游戏

### dev

```
git clone https://github.com/yakunyue/type

cd type
npm install

npm run dev
```

启动排行服务

```
cd /vol2/1000/app/type-master
PORT=18082 nohup node server/index.js > leaderboard.log 2>&1 &

```