// 게시글 관련 API
const express 			= require("express");
const router 			= express.Router();
const { PrismaClient }  = require('@prisma/client')
const prisma 			= new PrismaClient();
const Joi 				= require("joi");
const multer    		= require('multer')
const sharp     		= require('sharp')
const fs        		= require('fs')

const schema = Joi.object({
	userId: Joi.number(),
	title : Joi.string().min(1).max(20).required(),
	description: Joi.string().trim().min(1).max(300).required(),
	postimage : Joi.optional(),
	likecount: Joi.optional(),
	dislikecount: Joi.optional()
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

router.get('/', async (req, res) => {
	const Posts = await prisma.post.findMany({
		orderBy: {
		  createDate: 'desc',
		},
	  });
	  res.json(Posts);
}) // 글 전체 조회

router.get('/hotpost', async (req,res) => {

	const HotPosts = await prisma.post.findMany({
		where: {
			AND: [
			  {
				likecount: { gte: '5' }  
			  },
			  {
				NOT: {
				  dislikecount: { lte: '-10' }
				}
			  }
			]
		  },  
	  orderBy: {
		createDate: 'desc',
	  },
	});
	res.json(HotPosts);
})

router.get('/detail/:id', async (req, res) => {
	const { id } = req.params;
	const Posts = await prisma.post.findUnique({
        where: { id: Number(id) }, 
    });

    if (!Posts) {
        return res.status(404).json({ error: "없는 글 입니다." });
    }

    return res.status(200).json(Posts);
}) // 특정 글 조회

router.post('/add', upload.single('postimage'), async (req,res,next) => {
	try {
		let imageFile = null
		if(req.file) {
		  const compressedImage = await compressImage(req.file.path)  
		  imageFile = compressedImage 
		}
		
		const value = await schema.validateAsync(req.body);

		const createdPost = await prisma.post.create({
			data: {
			  ...value,
			  postimage: imageFile
			}
		  });
		  return res.status(200).send({message: "성공했어요!"});
	} catch (err) {
		console.error('에러: ', err);
		res.status(500).send('서버 에러')
	}
}) // 글 추가

router.delete('/remove/:id', async(req, res) => {
	const { id } = req.params;
	try {
		const deletedPost = await prisma.post.delete({
		  where: { id: Number(id) },
		});
		res.status(200).json({ deletedPost });
	  } catch (err) {
		console.log(err);
		if (err.code === 'P2025') {
		  res.status(404).json({ error: "해당 글 이 없습니다." });
		} else {
		  res.status(500).json({ error: "Error" });
		}
	  }
}) // 글 삭제

router.patch('/like/:id', async (req, res) => {
	const { id } = req.params;
  
	try {
		const post = await prisma.post.findUnique({
			where: {
			  id: Number(id)
			}
		  });
		  	  
		  const currentLikeCount = parseInt(post.likecount, 10) || 0;

		  const updatedLikeCount = currentLikeCount + 1;
		  
		  const updated = await prisma.post.update({
			where: { 
			  id: Number(id)
			},
			data: {  
			  likecount: String(updatedLikeCount)  
			}
		  });
	  
		  res.status(200).json(updated);
	
	} catch (error) {
		console.error('에러: ', error);
		res.status(500).send('서버 에러')
	}  
}) // 글 좋아요 API

router.patch('/dislike/:id', async (req, res) => {
	const { id } = req.params;
  
	try {
		const post = await prisma.post.findUnique({
			where: { id: Number(id) }  
		  });
		  
		  const currentDislikeCount = parseInt(post.dislikecount, 10) || 0;
		  
		  const updatedDislikeCount = currentDislikeCount - 1;
		  
		  const updated = await prisma.post.update({
			where: { 
			  id: Number(id)
			},
			data: {
				dislikecount: String(updatedDislikeCount)  
			}
		  });
	  
		  res.status(200).json(updated);
	
	} catch (error) {
		console.error('에러: ', error);
		res.status(500).send('서버 에러')
	}  
}) // 글 싫어요 API

module.exports = router