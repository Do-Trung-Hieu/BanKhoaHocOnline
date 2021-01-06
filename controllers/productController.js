let controller = {};
let models = require('../models');
let Product = models.Product;
let Pay = models.Pay;
let Sequelize = require('sequelize');
let Op = Sequelize.Op;


controller.getTrendingProducts = ()=>{
    return new Promise((resolve,reject)=>{
        Product
            .findAll({
                order:[
                    ['overallreview','DESC']
                ],
                limit:8,
                include: [{model: models.Topic}],
                attributes: ['id','name','price','imagepath']
            })
            .then(data=>resolve(data))
            .catch(error=>reject(new Error(error)));
    });
};

controller.getBestSeller = () => {
    return new Promise((resolve,reject)=>{
        Pay
            .findAll({
                order: [
                    [Sequelize.fn('COUNT',Sequelize.col('productId')),'DESC']
                ],
                group: ['Product.id','Product.name','productId'],
                attributes: 
                    [[Sequelize.fn('COUNT',Sequelize.col('productId')),'like_count']]
                ,
                include: [{
                    model: Product,
                    attributes: ['id','name','price','imagepath'],
                    include: []
                }]
            })
            .then(data => resolve(data))
            .catch(error => reject(new Error(error)));
    });
};

controller.getNewest = () => {
    return new Promise((resolve,reject)=> {
        Product
            .findAll({
                order: [ 
                    ['createdAt' , 'DESC']
                ],
                attributes: ['name','price','imagepath'],
                include: [],
                limit : 10,

            })
            .then(data => resolve(data))
            .catch(error => reject(new Error(error)));
    })
};


controller.getAll = (query)=>{
    return new Promise((resolve,reject)=>{
        let options = {
            include: [{model: models.Category}],
            attributes: ['id','name','price','imagepath','categoryId'],
            where:{
                price: {
                    [Op.gte]: query.min,
                    [Op.lte]: query.max
                }
            }
        };
        if(query.category > 0){
            options.where.categoryId = query.category;
        }
        if(query.search != ''){
            options.where.name = {
                [Op.iLike]: `%${query.search}%`
            }
        }
        if(query.topic > 0){
            options.where.topicId = query.topic;
        }
        if(query.limit > 0){
            options.limit = query.limit;
            // Lấy từ
            options.offset = query.limit * (query.page - 1);
        }
        if(query.sort){
            switch(query.sort){
                case 'name':
                    options.order = [['name','ASC']];
                    break;
                case 'price':
                    options.order = [['price','ASC']];
                    break;
                case 'overallreview':
                    options.order = [['overallreview','DESC']];
                    break;
                default:
                    options.order = [['name','ASC']];
                    break;
            }
        }
        Product
            .findAndCountAll(options) // {rows, count}
            .then(data=>resolve(data))
            .catch(error=>reject(new Error(error)));
    });
};

controller.getById = (id) =>{
    return new Promise((resolve,reject)=>{
        let product;
        Product
            .findOne({
                where: { id : id},
                attributes: ['id','name','price','description','summary','overallreview','reviewCount','imagepath'],
                include: [
                    {
                    model: models.Topic,
                    attributes: ['name'],
                    include: [{ 
                        model: models.Category,
                        attributes: ['name']
                        }]
                    },
                    {
                        model: models.Teacher
                    }
                ]
            })
            .then(result => {
                product = result;
                return models.Comment.findAll({
                    where: {productId: id, parentCommentId:null},
                    include: [
                        {
                            model: models.User
                        },
                        // Lấy thêm comment con
                        {
                            model:models.Comment,
                            as:'SubComments',
                            include:[{model:models.User}]
                        }]
                }); 
            })
            .then(comments => {
                product.Comments = comments;
                return models.Review.findAll({
                    where:{productId:id},
                    include:[{model: models.User}]
                });
            })
            .then(reviews => {
                product.Reviews = reviews;
                let stars = [];
                for(let i = 1; i<=5; i++){
                    stars.push(reviews.filter(item => (item.rating==i)).length);
                }
                product.stars = stars;
                resolve(product);   
            })
            .catch(error => reject(new Error(error)));
    });
};

module.exports = controller;