import { games } from '../server.js';

export const routes = app => {

    app.get('/white', (req, res) => {     
        res.render('game', {
            color: 'white'
        });
    });

    app.get('/black', (req, res) => {
        console.log(req);
        console.log(games);
        // if (!games[req.query.code]) {
        //     return res.redirect(`/?error=invalidCode ${JSON.stringify(games)}`);
        // }
        
        // res.render('game', {
        //     color: 'black'
        // });
    });
};