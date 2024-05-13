// 사용자 관련 API
const express 			= require("express");
const router 			= express.Router();
const { PrismaClient }  = require('@prisma/client')
const prisma 			= new PrismaClient();
const Joi 				= require("joi");
const bcrypt			= require('bcrypt')
const multer    		= require('multer')
const sharp     		= require('sharp')
const fs        		= require('fs')
const passport  		= require("passport");
require('../passportConfig')(passport);

const schema = Joi.object({
	userId: Joi.string().trim().regex(/^[a-z0-9]+$/).min(5).max(20).required(), // userId 최소 5자 이상
	nickname: Joi.string().trim().min(1).max(30).required(),
	password: Joi.string().trim().min(6).required(), // password 최소 6자 이상
	authority: Joi.string().trim().min(1).required(),
	userprofileimage : Joi.optional() 
});

/* 이미지 업로드 관련 */
const upload = multer({
    dest: 'public/images/',
    limits: {
        fileSize: 15 * 1024 * 1024, // 최대 제한 : 1장당 15MB 용량 제한
    },
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp|PNG|JPEG|JPG|WEBP)$/)) {
        return cb(new Error('.jpg 등 이미지 확장자만 사용 가능합니다.'));
      }
      cb(null, true);
    },
});

async function compressImage(imagePath) {
    try {
      await sharp(imagePath)
        .resize(800, 800)
        .jpeg({ quality: 90 }) // JPEG 형식으로 압축하고 품질 설정 (0-100 사이 값)
        .withMetadata()
        .toBuffer(async (err, buffer) => {
          if (err) throw err;
          await fs.writeFile(imagePath, buffer, (err) => {
            if (err) throw err;
          });
        });
      return imagePath;
    } catch (err) {
      console.log(err);
      return null;
    }
}
/* 이미지 업로드 관련 */


router.post('/signup', upload.single('userprofileimage'), async (req,res,next) => {

	try {
		let imageFile = null
		if(req.file) {
		  const compressedImage = await compressImage(req.file.path)  
		  imageFile = compressedImage 
		}
		
		  const value = await schema.validateAsync(req.body);
    
		  const hashedPassword = await bcrypt.hash(value.password, 10);
		  
		  const isUserIdDuplicated = await prisma.users.findUnique({
			where: {
			  userId: value.userId  
			}
		  });
		  
		  const isNicknameDuplicated = await prisma.users.findUnique({
			where: {
			  nickname: value.nickname
			}
		  });
		  
		  if (isUserIdDuplicated || isNicknameDuplicated) {
			res.status(400).send({message: "중복된 값입니다. 다른 값을 입력하세요!"});
			return;
		  }
		  
		  const createdUser = await prisma.users.create({
			data: {
			  ...value,
			  password: hashedPassword,
			  userprofileimage: imageFile
			}
		  });
		  
		  return res.status(200).send({message: "환영합니다! 회원가입에 성공했어요!"});
	} catch (err) {
		console.error('회원가입 에러: ', err);
		res.status(500).send('서버 에러')
	}
})

router.post('/login', (req, res, next) => {
	passport.authenticate('local', (authError, user, info) => {
	  if (authError) {
		console.error(authError);
		return next(authError);
	  }
	  if (!user) {
		return res.status(400).send(info.message);
	  }
	  return req.login(user, (loginError) => {
		if (loginError) {
		  console.error(loginError);
		  return next(loginError);
		}
		return res.status(200).send({ userId: user.userId, authority: user.authority });
	  });
	})(req, res, next);
});

router.get('/detail/:id', async (req, res, next) => {
	try {
		const { id } = req.params; 

		const user = await prisma.users.findUnique({
			where: { id: Number(id) }, 
			select: {
				id: true,
				userId: true,
				authority: true,
				nickname: true,
				createDate: true,
			},
		});
	
		if (!user) {
			return res.status(404).json({ error: "없는 사용자 입니다." });
		}
	
		return res.status(200).json(user);
	} catch (error) {
		console.error(error);
		return next(error); 
	  }
}) // 사용자 MyPage로 가져오기

module.exports = router