const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

app.use(cors({
    origin: "*"
}));
app.use(express.json());






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fs9am.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        await client.connect();
        const productCollection = client.db("CarToolsManufacturer").collection("tools")
        const reviewCollection = client.db("CarToolsManufacturer").collection("review")
        const orderCollection = client.db("CarToolsManufacturer").collection("order")
        const userCollection = client.db("CarToolsManufacturer").collection("users")
        const userProfileCollection = client.db("CarToolsManufacturer").collection("profile")
        const paymentCollection = client.db("CarToolsManufacturer").collection("payments")


        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next()
            } else {
                res.send(403).send({ message: 'forbidden' })
            }
        }

        // ==============================STRIPE PAYMENT API========================>>
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.totalPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount: amount,
              currency: 'usd',
              payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
          })


        // ==============================Tools Read/Get========================>>

        app.get('/tools', async (req, res) => {
            const services = await productCollection.find({}).toArray();
            res.send(services)
        })
        app.get('/all-tools', verifyJWT, verifyAdmin, async (req, res) => {
            const services = await productCollection.find({}).toArray();
            res.send(services)
        })

        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await productCollection.findOne(query);
            res.send(service);
        });

        // =========================== ToolsCreate/Post==========================>>

        app.post('/add-tools', verifyJWT, verifyAdmin, async (req, res) => {

            const data = req.body;
            const result = await productCollection.insertOne(data);
            res.send(result)
        })

        // =============================Tools Update/put==========================>>

        app.put("/update-tools/:id", async (req, res) => {
            const { id } = req.params;
            const data = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: data
            }
            const option = { upsert: true };
            const result = await productCollection.updateOne(filter, updateDoc, option);
            res.send(result)

        })

        // =============================Tools Delete==========================>>

        app.delete("/delete-tools/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const { id } = req.params;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result)
        })



        // =======================ReviewCollection Read/Get=====================>>

        app.get('/review', async (req, res) => {
            const services = await reviewCollection.find({}).toArray();
            res.send(services)
        })

        // =========================== Review Create/Post==========================>>

        app.post('/add-review', async (req, res) => {

            const data = req.body;
            const result = await reviewCollection.insertOne(data);
            res.send(result)
        })


        // =======================PRODUCT ORDER Read/Get=====================>>

        app.get('/orders', verifyJWT, verifyAdmin, async (req, res) => {
            const services = await orderCollection.find({}).toArray();
            res.send(services)
        })


        app.get('/order', verifyJWT, async (req, res) => {
            const customer = req.query.customer;
            const decodedEmail = req.decoded.email;
            if (customer === decodedEmail) {
                const query = { customer: customer }
                const services = await orderCollection.find(query).toArray();
                return res.send(services)
            } else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }

        })

        app.get('/orderProduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order)
        })

        // =========================== Order Create/Post==========================>>

        app.post('/order', async (req, res) => {

            const data = req.body;
            const result = await orderCollection.insertOne(data);
            res.send(result)
        })

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id)};
            const updatedDoc = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            }
      
            const result = await paymentCollection.insertOne(payment)
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedOrder)
          })

        // =============================USER GET================================>>

        app.get('/user', verifyJWT, async (req, res) => {
            const user = await userCollection.find().toArray()
            res.send(user)
        })

        // ==========================USER ADMIN Get============================>>

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        // ==========================USER ADMIN put============================>>

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' }
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result)
            } else {
                res.status(403).send({ message: 'Forbidden' })
            }

        })

        // =============================USER PUT================================>>

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30d' })
            res.send({ result, token })
        })

        // ==========================USER PROFILE PUT===========================>>

        app.put('/profile/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await userProfileCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' });
            res.send({ result, token })
        })

    } finally {
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})