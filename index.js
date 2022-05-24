const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

app.use(cors({
    origin: "*"
}));
app.use(express.json());


// carToolsManufacturer
// y5ruZcy8Gzzr3Qaa



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fs9am.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const productCollection = client.db("CarToolsManufacturer").collection("tools")
        const reviewCollection = client.db("CarToolsManufacturer").collection("review")
        const orderCollection = client.db("CarToolsManufacturer").collection("order")

        // ==============================Tools Read/Get========================>>

        app.get('/tools', async (req, res) => {
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

        app.post('/add-tools', async (req, res) => {

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

        app.delete("/delete-tools/:id", async (req, res) => {
            const { id } = req.params;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result)
        })



        // =====================================================================>>
        // =======================ReviewCollection Read/Get=====================>>
        // =====================================================================>>

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


        // =====================================================================>>
        // =======================PRODUCT ORDER Read/Get=====================>>
        // =====================================================================>>
        app.get('/order', async (req, res) => {
            const customer = req.query.customer;
            console.log(customer);
            const query = {customer: customer}
            const services = await orderCollection.find(query).toArray();
            res.send(services)
        })

        // =========================== Order Create/Post==========================>>

        app.post('/order', async (req, res) => {

            const data = req.body;
            const result = await orderCollection.insertOne(data);
            res.send(result)
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