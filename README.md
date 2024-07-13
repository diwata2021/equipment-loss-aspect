## 游戏装备折损计算框架-Aspect
背景是某个游戏中有地图概念，地图产生的收益由持有者定，可以通过转移进行售卖，但是每次售卖/转移有折损。
该Aspect针对这种NFT装备折损的场景，提供了一个自动化计算的解决方案。

## 具体设计
游戏的装备在转移和发售中可能产生各种特殊场景，其中折损是一个比较通用的。团队在合约调用前，支持计算该装备是否到达折损极限。
包含两个特点：
- 可装配的折损率计算公式，具体可以参考getSelectLossFunc里面的写法定义自己的折损计算方式
- 不依赖burn函数，不破坏合约本身owner的情况下，进行aspect级别的装备销毁
- 可以在合约中获取到折损率，用于marketplace

## 生态价值
- 为特殊游戏场景提供了一个简易aspect-demo
- 体现了aspect的可装配特性，让ERC-721标准不被破坏的前提下，能够额外增加复杂特性

## 目录结构
```bash
.
├── README.md
├── asconfig.json
├── aspect                 <-- 具体的aspect
│   └── index.ts
├── contracts                  <-- Place your smart contracts here
│   ├── AspectMap.sol       <-- 地图合约
├── scripts                    <-- Utility scripts, including deploying, binding and etc.
│   ├── aspect-deploy.cjs
│   ├── bind.cjs
│   ├── contract-call.cjs
│   └── contract-deploy.cjs
...
```

# Useful links

* [@artela/aspect-tools](https://docs.artela.network/develop/reference/aspect-tool/overview)

