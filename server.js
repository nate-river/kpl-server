'use strict';
const request = require('request');
const cheerio = require('cheerio');
const express = require('express');
const moment = require('moment');
const async = require('async');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8888;
app.use(express.static('./pics'));

function match_list(url, callback) {
    let matchs = [];
    request({
        url: url
    }, (err, header, body) => {
        let $ = cheerio.load(body);
        let urls = $('.matching_mn1_list li')
            .map((i, v) => $(v).attr('match'))
            .get()
            .map((v, i) => {
                return {
                    id: v,
                    url: 'http://www.wanplus.com/match/' + v + '.html',
                }
            });
        async.eachLimit(urls, 1, function (v, callback) {
            match_detail(v.url, function (data) {
                matchs.push({
                    id: v.id,
                    hometeam: data.hometeam,
                    guesteam: data.guesteam
                });
                callback()
            })
        }, function (err) {
            if (!err) {
                callback(matchs);
            }
        });
    });
}


function match_detail(url, callback) {
    request({
        url: url
    }, (err, header, body) => {
        if (err) {
            return null;
        }
        let $ = cheerio.load(body);

        let teams = $('.bssj_top a');
        teams = [teams.eq(0).find('.tl').attr('value'), teams.eq(1).find('.tr').attr('value')];

        let names = $('.matching_intro a').eq(1).find('span');
        names = [names.eq(0).text(), names.eq(2).text()];

        let scores = [0, 0];

        if ($('.bssj_winl').prev('i').text().trim()) {
            scores = [1, 0];
        } else {
            scores = [0, 1]
        }

        let data = {
            hometeam: {
                id: teams[0],
                name: names[0],
                score: scores[0],
                ban: [],
                pick: []
            },
            guesteam: {
                id: teams[1],
                name: names[1],
                score: scores[1],
                ban: [],
                pick: []
            }
        };
        $('.match_bans_list>li').each(function (index, el) {
            let heroes = $(this).find('.bans_top .bans_img .bbans').map((i, v) => $(v).attr('data-itemid')).get();
            let users = $(this).find('.bans_tx p a').map((i, v) => $(v).attr('href')).get();
            let names = $(this).find('.bans_tx p a strong').map((i, v) => $(v).text()).get();
            let teamAeq = $(this).find('.bans_l .bans_bot a').map((i, v) => $(v).attr('href').match(/\d+/g)[0]).get();
            let teamBeq = $(this).find('.bans_r .bans_bot a').map((i, v) => $(v).attr('href').match(/\d+/g)[0]).get();
            let kdas = $(this).find('.bans_m ul li').eq(0).find('span').map((i, v) => $(v).text()).get();
            let moneys = $(this).find('.bans_m ul li').eq(1).find('span').map((i, v) => $(v).text()).get();
            let damages = $(this).find('.bans_m ul li').eq(2).find('span').map((i, v) => $(v).text()).get();
            let endures = $(this).find('.bans_m ul li').eq(3).find('span').map((i, v) => $(v).text()).get();

            data.hometeam.pick.push({
                user: users[0].match(/\d+/g)[0],
                user_name: names[0],
                hero: heroes[0],
                equ: teamAeq,
                kda: kdas[0],
                money: moneys[0],
                damage: damages[0],
                endure: endures[0],
            });
            data.guesteam.pick.push({
                user: users[3].match(/\d+/g)[0],
                user_name: names[1],
                hero: heroes[1],
                equ: teamBeq,
                kda: kdas[2],
                money: moneys[2],
                damage: damages[2],
                endure: endures[2],
            })
        });
        callback(data);
    });
}

function get_schedule(callback) {
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
        if (err) {
            callback(null)
        } else {
            let $ = cheerio.load(body);
            let result = [];
            $('.fix_list .war').each((index, el) => {
                let id = Number(path.basename($(el).find('.teams a').attr('href'), '.html'));
                let date = (() => {
                    let t = $(el).find('.NO .time').map((index, v) => $(v).text()).get();
                    if (t.length) {
                        t.unshift('2018');
                        return moment(t.join('-'), 'YYYY-MM-DD-HH:mm')
                    } else {
                        return moment();
                    }
                })();
                let logos = $(el).find('.teamlogo img').map((index, el) => $(el).attr('src')).get();
                let names = $(el).find('.teamname').map((index, el) => $(el).text()).get();
                let scores = $(el).find('.teamcode').map((index, el) => $(el).text()).get();
                let match = {
                    id,
                    date,
                    hometeam: {
                        name: names[0],
                        id: Number(path.basename(logos[0], '.png').split('_')[0]),
                        score: Number(scores[0])
                    },
                    guesteam: {
                        name: names[1],
                        id: Number(path.basename(logos[1], '.png').split('_')[0]),
                        score: Number(scores[1])
                    }
                };
                result.push(match);
            });
            callback(result);
        }
    });
}

function get_jishousai(cb) {
    let urls = [
        {
            _gtk: 1334249061,
            eId: 592,
            stageId: 1946,
            gameType: 6
        },
        {
            _gtk: 1334249061,
            eId: 592,
            stageId: 1944,
            gameType: 6,
        },
        {
            _gtk: 1334249061,
            eId: 592,
            stageId: 1943,
            gameType: 6
        },
    ];
    var result = [];
    async.eachLimit(urls, 1, function (v, callback) {
        request.post({
            url: 'https://www.wanplus.com/ajax/event/shedule/detail',
            formData: v,
            headers: {
                origin: 'https://www.wanplus.com',
                cookie: 'wanplus_token=be4542ed8f9d17fae27e44ffb26fa9fd; wanplus_storage=lf4m67eka3o; wanplus_sid=197a65c2e86aa18ab8c7e99f7cef9d90; isShown=1; wp_pvid=3550652531; wanplus_csrf=_csrf_tk_1794037024; wp_info=ssid=s1561235728; Hm_lvt_f69cb5ec253c6012b2aa449fb925c1c2=1521854709,1521860898,1521876181,1521887402; gameType=6; Hm_lpvt_f69cb5ec253c6012b2aa449fb925c1c2=1521897556',
                referer: 'https://www.wanplus.com/event/592.html',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'
            }
        }, (err, header, body) => {
            if (err) {
                callback(null)
            } else {
                let $ = cheerio.load(body);
                $('.fix_list .war').each((index, el) => {
                    let id = Number(path.basename($(el).find('.teams a:last-child').attr('href'), '.html'));
                    let date = (() => {
                        let t = $(el).find('.NO .time').map((index, v) => $(v).text()).get();
                        if (t.length) {
                            t.unshift('2018');
                            return moment(t.join('-'), 'YYYY-MM-DD-HH:mm')
                        } else {
                            return moment();
                        }
                    })();
                    let logos = $(el).find('.teamlogo img').map((index, el) => $(el).attr('src')).get();
                    let names = $(el).find('.teamname').map((index, el) => $(el).text()).get();
                    let scores = $(el).find('.teamcode').map((index, el) => $(el).text()).get();
                    if (logos[0]) {
                        let match = {
                            id,
                            date,
                            hometeam: {
                                name: names[0] ? names[0] : '?',
                                id: logos[0] ? (Number(path.basename(logos[0], '.png').split('_')[0])) : 'null',
                                score: scores[0] ? Number(scores[0]) : 0
                            },
                            guesteam: {
                                name: names[1] ? names[1] : '?',
                                id: logos[1] ? (Number(path.basename(logos[1], '.png').split('_')[0])) : null,
                                score: scores[1] ? Number(scores[1]) : 0
                            }
                        };
                        result.push(match);
                    }

                });
                callback(null);
            }
        });
    }, function (err) {
        if (!err) {
            result.sort((a, b) => {
                return a.date.valueOf() - b.date.valueOf();
            });
            cb(result);
        }
    });
}


app.get('/jihousai', (req, res) => {
    get_jishousai(result => {
        if (result) {
            res.json({status: 200, result});
        } else {
            res.json({status: 404});
        }
    })
});

app.get('/schedule', (req, res) => {
    get_schedule((result) => {
        if (result) {
            res.json({status: 200, result});
        } else {
            res.json({status: 404});
        }
    });
});

app.get('/match', (req, res) => {
    let id = req.query.id;
    if (fs.existsSync(`./pics/match/${id}.json`)) {
        res.json({status: 200, data: require(`./pics/match/${id}.json`)});
    } else {
        match_list(`http://www.wanplus.com/schedule/${id}.html`, function (data) {
            if (data) {
                let x = 0;
                let y = 0;
                data.forEach((v, i) => {
                    x += v.hometeam.score;
                    y += v.guesteam.score;
                });
                if (x >= 3 || y >= 3) {
                    fs.writeFileSync(`./pics/match/${id}.json`, JSON.stringify(data, null, 4));
                }
                res.json({status: 200, data});
            } else {
                res.json({status: 404})
            }
        });
    }
});

app.get('/rate', (req, res) => {
    request(
        {
            url: 'https://www.wanplus.com/api.php?&sig=a4f435e7d8796353a944985f2b6fbdc3&eid=592&c=App_Stats&gm=kog&_param=862979037100221%7Cand%7C200%7C350%7C22%7C1523618719410%7C763552%7CkK514%2BTzPy3maUv8nzn9l%2B2fVqK1%2FyHDd8Mz0VLw55Pj5dW5xvmCEiQ11N9tHKs%7C4%7C&m=heroStats',
            headers: {
                userAgent: 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; vivo X7 Build/LMY47V)',
            }
        },
        (err, header, body) => {
            let r = JSON.parse(body);
            res.json(r.data.statsList);
        }
    );
});

app.get('/hero_rank', (req, res) => {
    request(
        {
            url: 'http://cgi.datamore.qq.com/datamore/smobahelper/herorank?mode=HeroRank2&userId=480299043&token=kDBm93WV&openid=owanlsnSOo_dGmbMb_kGPJHbMHmY&serverId=4060&uniqueRoleId=1360791437&unAuth=true&HeroType=0&GradeOfRank=1',
            headers: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E302;GameHelper',
                Referer: 'http://pvp.qq.com/act/idata_more_dev/career.html?toOpenid=owanlsnSOo_dGmbMb_kGPJHbMHmY&areaId=4&roleId=1099550493&appOpenid=oFhrws4tN9RyY40dxQV5cPy2-pp8&accessToken=10_ARtatSdEx5yDmCcRq8TXzog9rDN9eZhdXxjZqsozdaK71rUZ9Kinc93W6pv_PrvjwW3szvaY4TV97CK7mKUXm2n4wcv-58y4QTXTnQRyLoA&gameId=20001&serverName=%E5%BE%AE%E4%BF%A150%E5%8C%BA&roleLevel=30&openid=owanlsnSOo_dGmbMb_kGPJHbMHmY&userId=480299043&token=kDBm93WV&areaName=%E8%8B%B9%E6%9E%9C&roleName=SC%E2%80%A2%E6%B8%B8%E4%BE%A0&isMainRole=1&nickname=%E9%A9%AC%E5%BD%A6%E9%BE%99&uniqueRoleId=1360791437&serverId=4060&roleJob=%E6%B0%B8%E6%81%92%E9%92%BB%E7%9F%B3I'
            }
        },
        (err, header, body) => {
            let r = JSON.parse(body);
            res.json(r.Data.data);
        }
    );
});

app.get('/hero_equs', (req, res) => {
    let hero_id = req.query.hero_id;
    let result = [];
    let files = fs.readdirSync('./pics/match');
    for (let i = 0; i < files.length; i++) {
        let v = files[i];
        if (v !== '.gitkeep') {
            if (result.length >= 20) {
                res.json(result);
                return;
            }
            let data = require('./pics/match/' + v);
            data.forEach(item => {
                item.hometeam.pick.forEach(pick => {
                    if (pick.hero == hero_id) {
                        result.push(pick)
                    }
                });
                item.guesteam.pick.forEach(pick => {
                    if (pick.hero == hero_id) {
                        result.push(pick)
                    }
                });
            })

        }
    }
    res.json(result);
});
app.listen(port);
