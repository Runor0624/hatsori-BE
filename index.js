const express 		= require('express')
const session 		= require('express-session')
const cors	  		= require('cors')
const cookieParser  = require('cookie-parser')
const morgan        = require('morgan')
const helmet		= require('helmet')
const dotenv  		= require('dotenv')

dotenv.config()

const app = express()

if(process.env.NODE_ENV === 'production') {
    app.use(morgan('combined')) // 배포 환경 : log에 IP를 남김
} else {
    app.use(morgan('dev')) // 개발환경 에서  console.log에 log 기록
}

app.set('PORT', process.env.PORT || 3000)

app.use(cors({origin: '*'}))

/* Helmet 미들웨어 반영 부분 */
app.use(helmet.hidePoweredBy())
app.use(helmet.xssFilter());
app.use(helmet.referrerPolicy());
app.use(helmet.ieNoOpen());
app.use(helmet.hsts({
    maxAge: 60 * 60 * 24 * 365, 
    includeSubDomains: true, 
    preload: true 
}));
/* Helmet 미들웨어 반영 부분 */


app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,

    cookie: {
        secure: false
    }
}))

/* Router */
const VisitRouter  = require('./Router/Visit')


app.use('/visit', VisitRouter)

/* Router */

app.listen(app.get('PORT'), () => {
    console.log(app.get("PORT"), "OPEN")
})