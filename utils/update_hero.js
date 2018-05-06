'use strict';
const request = require('request');
const fs = require('fs');
const async = require('async');
const os = require('os');

function hero() {
    request.get('http://pvp.qq.com/web201605/js/herolist.json', (err, header, body) => {
        let list = eval(body);
        let css = '';
        async.eachOfLimit(list, 1, function (v, k, callback) {
            console.log(v.ename);
            let ws = fs.createWriteStream('./tmp.jpg');
            request.get(`http://game.gtimg.cn/images/yxzj/img201606/heroimg/${v.ename}/${v.ename}.jpg`)
                .pipe(ws);
            ws.on('finish', () => {
                let  base = 'data:img/jpg;base64,' + fs.readFileSync('./tmp.jpg').toString('base64');
                css += `.hero-${v.ename}{background:url(${base}) no-repeat center center/100% 100%}${os.EOL}`;
                callback();
            })
        }, function (err) {
            if (!err) {
                // fs.unlinkSync('./tmp.jpg');
                fs.writeFileSync('./hero.css', css);
            }
        });
    });
}

hero();







