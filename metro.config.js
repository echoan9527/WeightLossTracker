/*
 * @Author: Chengya
 * @Description: Description
 * @Date: 2026-07-06 17:18:07
 * @LastEditors: Chengya
 * @LastEditTime: 2026-07-06 17:18:55
 */
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-sqlite web 需要支持 .wasm 文件
config.resolver.assetExts.push("wasm");

module.exports = config;
