// 관리자 전용 - 공지사항
const express 			= require("express");
const router 			= express.Router();
const { PrismaClient }  = require('@prisma/client')
const prisma 			= new PrismaClient();
const Joi 				= require("joi");

const schema = Joi.object({
	userId: Joi.number(),
	title: Joi.string().trim().min(1).max(40).required(),
	description: Joi.string().trim().min(1).max(300).required()
});

router.get('/', async (req, res) => {
	const Notice = await prisma.notices.findMany({
		orderBy: {
		  createDate: 'desc',
		},
	  });
	  res.json(Notice);
})


router.post('/', async (req, res) => {
	const { error } = schema.validate(req.body);
  	if (error) {
    	return res.status(400).json({ error: error.details[0].message });
  	}

	try {
	const { title, description, userId } = req.body;

	const result = await prisma.notices.create({
	  data: {
		userId,
		title,
		description,
	  },
	});
	res.json(result);  
	} catch(err) {
		console.log(err);
  		res.status(500).json({ error: "Error" });
	}
});

router.delete('/remove/:id', async(req, res) => {
	const { id } = req.params;
	try {
		const deletedNotice = await prisma.notices.delete({
		  where: { id: Number(id) },
		});
		res.status(200).json({ deletedNotice });
	  } catch (err) {
		console.log(err);
		if (err.code === 'P2025') {
		  res.status(404).json({ error: "해당 공지사항 글 이 없습니다." });
		} else {
		  res.status(500).json({ error: "Error" });
		}
	  }
})
module.exports = router