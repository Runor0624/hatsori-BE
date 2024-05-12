const express 			= require("express");
const router 			= express.Router();
const { PrismaClient }  = require('@prisma/client')
const prisma 			= new PrismaClient();
const Joi 				= require("joi");
const requestIp			= require('request-ip')

// 사용자가 익명의 방명록을 남기도록 합니다.
const schema = Joi.object({
	title: Joi.string().min(1).max(20).required(),
	description: Joi.string().min(1).max(300).required()
});

router.get('/', async (req, res) => {
	const Visit = await prisma.visit.findMany({
		orderBy: {
		  createDate: 'desc',
		},
	  });
	  res.json(Visit);
})

router.post('/', async (req, res) => {
	const { error } = schema.validate(req.body);
  	if (error) {
    	return res.status(400).json({ error: error.details[0].message });
  	}

	try {
	const { title, description } = req.body;
	const userIp = requestIp.getClientIp(req);
	
	const result = await prisma.visit.create({
	  data: {
		title,
		description,
		userIp: userIp  
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
		const deletedVisit = await prisma.visit.delete({
		  where: { id: Number(id) },
		});
		res.status(200).json({ deletedVisit });
	  } catch (err) {
		console.log(err);
		if (err.code === 'P2025') {
		  res.status(404).json({ error: "해당 id를 가진 방명록이 존재하지 않습니다" });
		} else {
		  res.status(500).json({ error: "Error" });
		}
	  }
})

module.exports = router