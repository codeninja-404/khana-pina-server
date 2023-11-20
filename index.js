const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

const uri = `${process.env.DB_URI}`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //  DAta collections

    const userCollection = client.db("khanapinaDB").collection("users");
    const menuCollection = client.db("khanapinaDB").collection("menu");
    const reviewCollection = client.db("khanapinaDB").collection("reviews");
    const cartCollection = client.db("khanapinaDB").collection("carts");

    // jwt related api
    app.post("/api/v1/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.send({ token });
    });

    //  middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verifyToken ", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // user verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    // users related api
    app.get("/api/v1/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // admin relates network request

    app.get("/api/v1/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
        res.send({ admin });
      }
      const isAdmin = user;
    });

    app.post("/api/v1/users", async (req, res) => {
      const user = req.body;
      // insert email if user doesnot exiest
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exiests.", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // patch user to admin
    app.patch("/api/v1/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    //  delete user
    app.delete(
      "/api/v1/users/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      }
    );

    // READ/get operations
    // get menu

    app.get("/api/v1/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    //  post menu
    app.post("/api/v1/menu", async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    // get reviews
    app.get("/api/v1/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // carts collection

    //  load/get specific users cart

    app.get("/api/v1/carts", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    //post cart

    app.post("/api/v1/carts", async (req, res) => {
      const cartItem = req.body;

      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    // delete cart items
    app.delete("/api/v1/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Khana-Pina surver is running");
});

app.listen(port, () => {
  console.log("khana-pina server is running on port :", port);
});
