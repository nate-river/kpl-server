'use strict';
const request = require('request');
const cheerio = require('cheerio');
const express = require('express');
const moment = require('moment');
const async = require('async');
const fs = require('fs');
const app = express();
const port = 5000;
app.use(express.static('./pics'));
app.get('/schedule', (req, res) => {
    let formData = {
        _gtk: 1794037024,
        eId: 592,
        stageId: 1805,
        gameType: 6
    };
    request.post({
        url: 'https://www.wanplus.com/ajax/event/shedule/detail',
        formData: formData,
        headers: {
            origin: 'https://www.wanplus.com',
            cookie: 'wanplus_token=be4542ed8f9d17fae27e44ffb26fa9fd; wanplus_storage=lf4m67eka3o; wanplus_sid=197a65c2e86aa18ab8c7e99f7cef9d90; isShown=1; wp_pvid=3550652531; wanplus_csrf=_csrf_tk_1794037024; wp_info=ssid=s1561235728; Hm_lvt_f69cb5ec253c6012b2aa449fb925c1c2=1521854709,1521860898,1521876181,1521887402; gameType=6; Hm_lpvt_f69cb5ec253c6012b2aa449fb925c1c2=1521897556',
            referer: 'https://www.wanplus.com/event/592.html',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'
        }
    }, (err, header, body) => {
        if(err){
            res.json({status:404})
        }
        let $ = cheerio.load(body);
        let result = {};
        $('.fix_list .war').each((index, el) => {
            let t = $(el).find('.NO .time').map((index, v) => $(v).text()).get();

            let date = t[0]|| moment().format('MM-DD');
            let time = t[1];
            let link = $(el).find('.teams a').attr('href');

            let logos = $(el).find('.teamlogo img').map((index, el) => $(el).attr('src')).get();
            let names = $(el).find('.teamname').map((index, el) => $(el).text()).get();
            let scores = $(el).find('.teamcode').map((index, el) => $(el).text()).get();
            let data = {
                link: link,
                time: time,
                teamA: {
                    name: names[0],
                    logo: logos[0],
                    score: scores[0]
                },
                teamB: {
                    name: names[1],
                    logo: logos[1],
                    score: scores[1]
                }
            };
            if (!result[date]) {
                result[date] = [];
            }
            result[date].push(data);
        });
        res.json({status:200,result});
    });
});
app.get('/match', (req, res) => {
    let id = req.query.id;
    if (fs.existsSync(`./pics/match/${id}.json`)) {
        res.json(require(`./pics/match/${id}.json`));
    } else {
        match_list(`http://www.wanplus.com/schedule/${id}.html`, function (data) {
            if (data) {
                fs.writeFileSync(`./pics/match/${id}.json`, JSON.stringify(data,null,4));
                res.json({status: 200, data});
            } else {
                res.json({status: 404})
            }
        });
    }
});

function match_list(url, callback) {
    let d = [];
    request({
        url: url
    }, (err, header, body) => {
        let $ = cheerio.load(body);
        let urls = $('.matching_mn1_list li')
            .map((i, v) => $(v).attr('match'))
            .get()
            .map((v, i) => 'http://www.wanplus.com/match/' + v + '.html');
        async.eachLimit(urls, 1, function (v, callback) {
            match_detail(v, function (data) {
                d.push({
                    matchId: v,
                    d: data
                });
                callback()
            })
        }, function (err) {
            if (!err) {
                callback(d);
            }else{
                callback(null);
            }
        });
    });
}
//match detail
function match_detail(url, callback) {
    request({
        url: url
    }, (err, header, body) => {
        if (err) {
            callback(null);
        }
        let $ = cheerio.load(body);
        let data = {
            teamA: {
                ban: [],
                pick: []
            },
            teamB: {
                ban: [],
                pick: []
            }
        };
        $('.match_bans_list>li').each(function (index, el) {
            let heroes = $(this).find('.bans_top .bans_img .bbans').map((i, v) => $(v).attr('data-itemid')).get();
            let users = $(this).find('.bans_tx p a').map((i, v) => $(v).attr('href')).get();
            let teamAeq = $(this).find('.bans_l .bans_bot a').map((i, v) => $(v).attr('href').match(/\d+/g)[0]).get();
            let teamBeq = $(this).find('.bans_r .bans_bot a').map((i, v) => $(v).attr('href').match(/\d+/g)[0]).get();
            data.teamA.pick.push({
                user: users[0].match(/\d+/g)[0],
                hero: heroes[0],
                equ: teamAeq
            });
            data.teamB.pick.push({
                user: users[3].match(/\d+/g)[0],
                hero: heroes[1],
                equ: teamBeq
            })
        });
        callback(data);
    });
}
app.listen(port);
