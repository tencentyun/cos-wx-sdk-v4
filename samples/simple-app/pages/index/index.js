//index.js

var CosCloud = require('../../lib/cos-wx-sdk-v4');
var CryptoJS = require('../../lib/crypto');
var config = require('./config');

var appid = config.appid;
var bucket = config.bucket;
var region = config.region;
var sid = config.sid;
var skey = config.skey;
var getSignature = function (once) {
    var that = this;
    var random = parseInt(Math.random() * Math.pow(2, 32));
    var now = parseInt(new Date().getTime() / 1000);
    var e = now + 60; //签名过期时间为当前+60s
    var path = ''; //多次签名这里填空
    var str = 'a=' + appid + '&k=' + sid + '&e=' + e + '&t=' + now + '&r=' + random +
        '&f=' + path + '&b=' + bucket;
    var sha1Res = CryptoJS.HmacSHA1(str, skey);//这里使用CryptoJS计算sha1值，你也可以用其他开源库或自己实现
    var strWordArray = CryptoJS.enc.Utf8.parse(str);
    var resWordArray = sha1Res.concat(strWordArray);
    var res = resWordArray.toString(CryptoJS.enc.Base64);
    return res;
};

var cos = new CosCloud({
    appid: appid, // APPID 必填参数
    bucket: bucket, // bucketName 必填参数
    region: region, // 地域信息 必填参数 华南地区填gz 华东填sh 华北填tj
    getAppSign: function (callback) {//获取签名 必填参数

        // 下面简单讲一下获取签名的几种办法
        // 首先，签名的算法具体查看文档：[COS V4 API 签名算法](https://www.qcloud.com/document/product/436/6054)

        // 1.搭建一个鉴权服务器，自己构造请求参数获取签名，推荐实际线上业务使用，优点是安全性好，不会暴露自己的私钥
        // 拿到签名之后记得调用callback
        /*
        wx.request({
            url: 'SIGN_URL',
            data: {once: false},
            dataType: 'text',
            success: function (result) {
                var sig = result.data;
                callback(sig);
            }
        });
         */

        // 2.直接在浏览器前端计算签名，需要获取自己的 accessKey 和 secretKey, 一般在调试阶段使用
        // 拿到签名之后记得调用 callback
        var res = getSignature(false); // 这个函数自己根据签名算法实现
        callback(res);

        // 3.直接复用别人算好的签名字符串, 一般在调试阶段使用
        // 拿到签名之后记得调用 callback
        // callback('YOUR_SIGN_STR')

    },
    getAppSignOnce: function (callback) { //单次签名，必填参数，参考上面的注释即可
        // 填上获取单次签名的逻辑
        var res = getSignature(true); // 这个函数自己根据签名算法实现
        callback(res);
    }
});

var ERR = {
    // 其他错误码查看文档：https://www.qcloud.com/document/product/436/6059
    'ERROR_CMD_COS_PATH_CONFLICT': '文件/目录已存在',
    'ERROR_CMD_FILE_NOTEXIST': '文件/目录不存在',
    'ERROR_SAME_FILE_UPLOAD': '不能覆盖已存在文件'
};

//获取应用实例
Page({
    // 回调统一处理函数
    createCallBack: function (msg) {
        var that = this;
        return function (result) {
            console.log(result);
            that.loading(0);
            if (result.errMsg != 'request:ok' && result.errMsg != 'uploadFile:ok') {
                wx.showModal({title: '请求出错', content: '请求出错：' + result.errMsg + '；状态码：' + result.statusCode,
                    showCancel: false});
            } else if (result.data.code) {
                wx.showModal({title: '返回错误',
                    content: (msg || '请求') + '失败：' + (ERR[result.data.message] || result.data.message) +
                    '；状态码：' + result.statusCode, showCancel: false});
            } else {
                wx.showToast({title: (msg || '请求') + '成功', icon: 'success', duration: 3000});
            }
        }
    },
    // 回调统一处理函数
    loading: function (isLoading, msg) {
        if (isLoading) {
            wx.showToast({title: (msg || '正在请求...'), icon: 'loading', duration: 60000});
        } else {
            wx.hideToast();
        }
    },
    // 创建目录
    createFolder: function () {
        cos.createFolder(this.createCallBack('1. /test 目录创建'), this.createCallBack(), bucket, '/test', 'folder_first_attr'); // 最后的 bizAttr 参数可省略
    },
    // 列出目录
    getFolderList: function () {
        cos.getFolderList(this.createCallBack('2. /test 目录列出'), this.createCallBack(), bucket, '/test');
    },
    // 查询目录属性
    getFolderStat: function () {
        cos.getFolderStat(this.createCallBack('3. /test 目录属性查询'), this.createCallBack(), bucket, '/test');
    },
    // 更新目录属性
    updateFolder: function () {
        cos.updateFolder(this.createCallBack('4. /test 目录属性更新'), this.createCallBack(), bucket, '/test', 'folder_new_attr');
    },
    // 删除目录
    deleteFolder: function () {
        cos.deleteFolder(this.createCallBack('5. /test 目录删除'), this.createCallBack(), bucket, '/test');
    },
    // 简单上传文件
    uploadFile: function () {
        var that = this;
        wx.chooseImage({
            count: 1,
            sizeType: ['original', 'compressed'],
            sourceType: ['album', 'camera'],
            success: function (res) {
                if (res.tempFilePaths && res.tempFilePaths.length) {
                    var tempFilePath = res.tempFilePaths[0];
                    that.loading(1, '正在上传...');
                    cos.uploadFile(that.createCallBack('6. /test.png 文件上传'), that.createCallBack(), bucket, '/test.png', tempFilePath, 0); // insertOnly==0 表示允许覆盖文件 1表示不允许覆盖
                }
            }
        });
    },
    // 查询文件属性
    getFileStat: function () {
        cos.getFileStat(this.createCallBack('7. /test.png 文件属性查询'), this.createCallBack(), bucket, '/test.png');
    },
    // 更新文件属性
    updateFile: function () {
        cos.updateFile(this.createCallBack('8. /test.png 文件属性更新'), this.createCallBack(), bucket, '/test.png', 'file_new_attr');
    },
    // 删除文件
    deleteFile: function () {
        cos.deleteFile(this.createCallBack('9. /test.png 文件删除'), this.createCallBack(), bucket, '/test.png');
    },
    // 复制文件
    copyFile: function () {
        cos.copyFile(this.createCallBack('10. /test.png 文件复制'), this.createCallBack(), bucket, '/test.png', '/test-cp.png', 1); // overWrite==0 表示允许覆盖文件 1表示不允许覆盖
    },
    // 移动文件
    moveFile: function () {
        cos.moveFile(this.createCallBack('11. /test.png 文件移动'), this.createCallBack(), bucket, '/test.png', '/test-mv.png', 1); // overWrite==0 表示允许覆盖文件 1表示不允许覆盖
    }
});
