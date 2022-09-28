'use strict';

// fs
const fs = require('fs');

// path
const path = require('path');

// root path
const rootPath = process.cwd();

// user path
const userPath = process.env.USERPROFILE;

// json reader
function jsonReader(filePath = './', returnArray = true) {
    try {
        const data = JSON.parse(fs.readFileSync(filePath));
        return data;
    } catch (error) {
        console.log(error);

        if (returnArray) {
            return [];
        } else {
            throw error;
        }
    }
}

// json writer
function jsonWriter(filePath = './', data = []) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, '\t'));
    } catch (error) {
        console.log(error);
    }
}

// image writer
function imageWriter(filePath = './', imageBuffer = Buffer.from('')) {
    fs.writeFileSync(filePath, Buffer.from(imageBuffer, 'base64'));
}

// file writer
function fileWriter(filePath = './', data) {
    fs.writeFileSync(filePath, data);
}

// file checker
function fileChecker(filePath = './') {
    return fs.existsSync(filePath);
}

// get path
function getPath(...args) {
    return path.join(...args);
}

// get root path
function getRootPath(...args) {
    return path.join(rootPath, ...args);
}

// get user path
function getUserPath(...args) {
    return path.join(userPath, ...args);
}

// get user path
function getUserDataPath(...args) {
    return path.join(userPath, 'Documents', 'Tataru Helper Node', ...args);
}

// module exports
module.exports = {
    jsonReader,
    jsonWriter,
    imageWriter,
    fileWriter,
    fileChecker,
    getPath,
    getRootPath,
    getUserPath,
    getUserDataPath,
};
