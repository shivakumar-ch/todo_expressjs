const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const { format, isValid } = require("date-fns");

const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("server is running at http://localhost:3000");
    });
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

initializeDbAndServer();

const getColumnName = (body) => {
  console.log(body);
  if (body.category !== undefined && body.priority !== undefined) {
    return "Category And Priority";
  } else if (body.category !== undefined && body.status !== undefined) {
    return "Category And Status";
  } else if (body.status !== undefined && body.priority !== undefined) {
    return "Status And Priority";
  } else if (body.status !== undefined) {
    return "Status";
  } else if (body.priority !== undefined) {
    return "Priority";
  } else if (body.category !== undefined) {
    return "Category";
  } else if (body.date !== undefined) {
    return "Due Date";
  } else if (body.dueDate !== undefined) {
    return "Due Date";
  } else if (body.todo !== undefined) {
    return "Todo";
  } else if (body.search_q !== undefined) {
    return "search";
  }
};
// middleware function for different methods
const invalidRequestFunction = async (request, response, next) => {
  const priorityValues = ["HIGH", "MEDIUM", "LOW"];
  const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  const categoryValues = ["WORK", "HOME", "LEARNING"];
  if (request.method === "POST") {
    const { status, priority, category, dueDate } = request.body;
    const postedDate = new Date(dueDate);
    let inputValid = false;
    let errMsg = "Invalid Todo Status";
    console.log(statusValues.includes(status), status);
    if (statusValues.includes(status)) {
      errMsg = "Invalid Todo Priority";
      if (priorityValues.includes(priority)) {
        errMsg = "Invalid Todo Category";
        if (categoryValues.includes(category)) {
          errMsg = "Invalid Due Date";
          if (isValid(postedDate)) {
            inputValid = true;
          }
        }
      }
    }

    if (inputValid) {
      next();
    } else {
      response.status(400);
      response.send(errMsg);
    }
  } else {
    let { status, priority, category, date, search_q = "" } = request.query;
    let columnName = getColumnName(request.query);
    if (request.method === "PUT") {
      status = request.body.status;
      priority = request.body.priority;
      category = request.body.category;
      date = request.body.dueDate;
      columnName = getColumnName(request.body);
    }

    const formatedDate = new Date(date);
    console.log(request.method);

    let result = false;
    let failureMsg = `Invalid Todo ${columnName}`;

    switch (columnName) {
      case "Status":
        console.log(statusValues.includes(status), status);
        if (statusValues.includes(status)) {
          result = true;
        }
        break;
      case "Priority":
        if (priorityValues.includes(priority)) {
          result = true;
        }
        break;
      case "Status And Priority":
        console.log("sfvsfgsf", statusValues.includes(status));
        failureMsg = "Invalid Todo Status";
        if (statusValues.includes(status)) {
          failureMsg = "Invalid Todo Priority";
          if (priorityValues.includes(priority)) {
            result = true;
          }
        }
        break;
      case "Category And Priority":
        failureMsg = "Invalid Todo Category";
        if (categoryValues.includes(category)) {
          failureMsg = "Invalid Todo Priority";
          if (priorityValues.includes(priority)) {
            result = true;
          }
        }
        break;
      case "Category And Status":
        console.log(statusValues.includes(status), "cat");
        failureMsg = "Invalid Todo category";
        if (categoryValues.includes(category)) {
          failureMsg = "Invalid Todo Status";
          if (statusValues.includes(status)) {
            result = true;
          }
        }
        break;
      case "Category":
        console.log(categoryValues.includes(category));
        if (categoryValues.includes(category)) {
          result = true;
        }
        break;
      case "Due Date":
        console.log(isValid(formatedDate), "date");
        if (isValid(formatedDate)) {
          result = true;
        }
        failureMsg = "Invalid Due Date";
        break;
      case "search":
        result = true;
        break;
      default:
        query = null;
        break;
    }
    console.log(result, columnName, "result");
    if (result) {
      next();
    } else {
      response.status(400);
      response.send(failureMsg);
    }
  }
};

// get item by id
app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  getQuery = `
        SELECT * FROM todo WHERE id = ${todoId}
    `;
  const res = await db.get(getQuery);
  if (res !== undefined) {
    response.send(res);
  } else {
    response.status(400);
    response.send("Invalid Id");
  }
});

// get item based on date
app.get("/agenda/", invalidRequestFunction, async (request, response) => {
  const { date } = request.query;
  const formatedDate = format(new Date(date), "yyyy-MM-dd");
  console.log(formatedDate, "date");
  getQuery = `
        SELECT * FROM todo WHERE due_date = '${formatedDate}'
    `;
  const res = await db.all(getQuery);
  response.send(res);
});

// create todo
app.post("/todos/", invalidRequestFunction, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  console.log("adad");
  const createQuery = `
    INSERT INTO todo (id,todo,priority,status,category,due_date)
    values (
        ${id},'${todo}','${priority}','${status}','${category}','${dueDate}'
    );
  `;
  const res = await db.run(createQuery);
  response.send("Todo Successfully Added");
  console.log(res);
});

// delete item by id
app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  getQuery = `
        DELETE FROM todo WHERE id = ${todoId}
    `;
  const res = await db.run(getQuery);
  console.log(res);
  response.send("Todo Deleted");
});

// update item by id
app.put("/todos/:todoId", invalidRequestFunction, async (request, response) => {
  const { todoId } = request.params;
  const columnName = getColumnName(request.body);
  oldTodoQuery = `
    select * from todo where id=${todoId}
  `;
  const oldTodo = await db.get(oldTodoQuery);

  if (oldTodo !== undefined) {
    const {
      todo = oldTodo.todo,
      status = oldTodo.status,
      priority = oldTodo.priority,
      category = oldTodo.category,
      dueDate = oldTodo.due_date,
    } = request.body;

    updateQuery = `
            UPDATE todo 
            SET status='${status}',
                 todo='${todo}',
                priority='${priority}',
                category='${category}',
                due_date='${dueDate}'
            WHERE id=${todoId}
        `;
    const res = await db.run(updateQuery);
    console.log(res);
    response.send(`${columnName} Updated`);
  } else {
    response.status(400);
    response.send("Todo Not Found");
  }
});

app.get("/todos/", invalidRequestFunction, async (request, response) => {
  const { status, priority, category, dueDate, search_q } = request.query;
  console.log(getColumnName(request.query));
  let getQuery = "";

  switch (getColumnName(request.query)) {
    case "Status":
      getQuery = `
                SELECT * FROM todo WHERE status='${status}'
            `;
      break;
    case "Priority":
      getQuery = `
                SELECT * FROM todo WHERE priority='${priority}'
            `;
      break;
    case "Status And Priority":
      getQuery = `
                SELECT * FROM todo WHERE priority='${priority}' and status='${status}'
            `;
      break;
    case "Category And Priority":
      getQuery = `
                SELECT * FROM todo WHERE priority='${priority}' and category='${category}'
            `;
      break;
    case "Category And Status":
      getQuery = `
                SELECT * FROM todo WHERE category='${category}' and status='${status}'
            `;
      break;
    case "Category":
      getQuery = `
                SELECT * FROM todo WHERE category='${category}'
            `;
      break;
    case "search":
      getQuery = `
                SELECT * FROM todo WHERE todo LIKE '%${search_q}%'
            `;
      break;
    default:
      getQuery = null;
      break;
  }
  const data = await db.all(getQuery);
  response.send(data);
});
module.exports = app;
