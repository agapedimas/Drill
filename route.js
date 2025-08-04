const SQL = require("./sql");
const Variables = require("./variables");
const Authentication = require("./authentication");
const Accounts = require("./accounts");
const Functions = require("./functions");
const Language = require("./language");
const Courses = require("./courses");
const FileIO = require("fs");
const path = require("path");

/**
 * @param { import("express").Application } Server Express instance
 * @returns { void }
 */
function Route(Server) 
{  
    // DEFAULT
    {
        Server.post("/ping", function(req, res)
        {
            res.send();
        });

        Server.post("/admin/signin", async function(req, res)
        {
            const valid = await Authentication.CheckCredentials(req.body.username, req.body.password);

            if (valid)
            {
                const account = (await Accounts.Get({ username: req.body.username })).at(0);
                const sessionId = await Authentication.Add(account.id, req.ip, true);
                req.session.account = sessionId;
                res.send();
            }
            else
            {
                res.status(401).send();
            }
        });

        Server.get("/admin/signout", async function(req, res)
        {
            if (req.session.account)
            {
                await Authentication.Remove(req.session.account);
                delete req.session["admin"];
            }

            res.redirect("/admin/signin");
        });

        Server.get("/admin*", async function(req, res, next)
        {
            const path = req.url;
            const isHTML = FileIO.existsSync("./public/" + path + ".html") || FileIO.existsSync("./public/" + path + "/index.html");
            const hasAccess = await Authentication.HasAccess(req.session.account, ["editor", "admin"]);

            if (hasAccess == false && path != "/admin/signin" && path != "/admin/manifest.json")
            {
                if (isHTML)
                {
                    req.session.redirect = req.url;
                    return res.redirect("/admin/signin");
                }
                else
                {
                    return res.status(403).send();
                }
            }
            else if (hasAccess == true)
            {
                if (path == "/admin" || path == "/admin/signin")
                {
                    const redirect = req.session.redirect;
                    req.session.redirect = null;

                    if (redirect)
                        return res.redirect(redirect);
                    else
                        return res.redirect("/admin" + Variables.WebHomepage);
                }

                const id = await Authentication.GetAccountId(req.session.account);
                const account = await Accounts.Get({ id });
                
                Object.assign(req.variables, 
                    {
                        "activeuser": JSON.stringify(account[0]),
                        "activeuser.id": account[0].id,
                        "activeuser.nickname": account[0].nickname || account[0].username,
                        "activeuser.username": account[0].username,
                        "activeuser.role": account[0].role,
                        "activeuser.role.display": Language.Data[req.session.language]["roles"][account[0].role],
                        "activeuser.url": account[0].url
                    }
                );
            }

            next();
        });

        Server.post("/admin*", async function(req, res, next)
        {
            const path = req.url;
            if (await Authentication.HasAccess(req.session.account, ["editor", "admin"]) == false && path != "/admin/signin")
            {
                res.status(403).send();
            }
            else
            {
                next();
            }
        });

        Server.post("/language/", async function(req, res)
        {
            if (Language.Available.includes(req.body.language))
            {
                req.session.language = req.body.language;
                res.send();
            }
            else
            {
                res.status(404).send("Language '" + req.body.language + "' is not available.");
            }
        });
    }

    Server.get("/avatar/*", async function(req, res)
    {
        res.header("Cache-Control", "public, max-age=3600");
        
        const paths = req.path.split("/").filter(o => o != "");
        const avatarPath = "./src/avatars/" + paths[1];

        if (FileIO.existsSync(avatarPath))
            res.sendFile(avatarPath, { root: "./" });
        else
            res.sendFile("./src/avatar.webp", { root: "./" });
    });

    Server.get("/banner/*", async function(req, res)
    {
        res.header("Cache-Control", "public, max-age=3600");

        const paths = req.path.split("/").filter(o => o != "");
        const bannerPath = "./src/banners/" + paths[1];

        if (FileIO.existsSync(bannerPath))
            res.sendFile(bannerPath, { root: "./" });
        else
            res.sendFile("./src/blank.png", { root: "./" });
    });

    Server.get("/roles/get", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, ["editor", "admin"]) == false)
            return res.status(403).send();

        const result = await SQL.Query("SELECT name FROM roles;");

        res.send(result.data?.map(o => { 
            return {
                name: Language.Data[req.session.language]["roles"][o.name], 
                value: o.name 
            }
        }) || []);
    });

    Server.get("/accounts/get", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, ["editor", "admin"]) == true)
            res.header("Cache-Control", "public, max-age=60");
        
        const type = req.query.type;
        let accounts;
        
        if (type == "editor")
        {
            const type1 = await Accounts.Get({ role: "admin" });
            const type2 = await Accounts.Get({ role: "editor" });
            accounts = type1.concat(type2);
        }
        else if (type)
        {
            accounts = await Accounts.Get({ role: type });
        }
        else
        {
            accounts = await Accounts.Get();
        }

        res.send(accounts);
    });

    Server.post("/accounts/create", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, "admin") == false)
            return res.status(403).send("You don't have permission to create an account.");
        
        const details = 
        {
            username: req.body.username,
            nickname: req.body.nickname,
            url: req.body.url,
            password: req.body.password,
            role: req.body.role
        }

        for (const key of Object.keys(details))
        {
            if ((details[key] == null || details[key].trim() == "") && key != "url")
                return res.status(400).send(key + " can't be empty");
            else
                details[key] = details[key].trim();
        }

        const id = await Accounts.Add(details.username, details.nickname, details.url, details.password, details.role);
        const account = await Accounts.Get({ id: id });

        if (id)
            res.send(account[0]);
        else
            res.status(500).send();
    });

    Server.delete("/accounts/delete", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, "admin") == false)
            return res.status(403).send("You don't have permission to delete an account.");

        if (req.body.id == null || req.body.id.trim() == "")
            return res.status(400).send("Id can't be empty.");

        const success = await Accounts.Remove(req.body.id);

        if (success)
            res.send();
        else
            res.status(500).send();
    });

    Server.post("/accounts/setavatar", async function(req, res)
    {
        const id = req.session.account;
        const account = await Authentication.GetAccountId(id);

        if (!id || !account)
            return res.status(403).send();
        
        const buffer = req.files.file.data;

        if (buffer.length > 2000000)
            return res.status(400).send("Maximum file size is 2MB.");
        
        const success = await Accounts.Avatars.Save(account, buffer);
        
        if (success)
            res.send();
        else
            res.status(500).send();
    });

    Server.post("/accounts/clearavatar", async function(req, res)
    {
        const id = req.session.account;

        if (id == null)
            return res.status(403).send();
        
        const success = Accounts.Avatars.Delete(id);
        
        if (success)
            res.send();
        else
            res.status(500).send();
    });

    Server.get("/courses/get", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, ["editor", "admin"]) == true)
            res.header("Cache-Control", "public, max-age=30");

        const courses = await Courses.Get(req.query.id);
        res.send(courses);
    });

    Server.get("*/courses/*", async function(req, res, next)
    {
        let paths = req.path.split("/").filter(o => o);
        const isAdmin = paths[0] == "admin";

        if (isAdmin)
            paths = paths.slice(1);

        if (paths.length == 2)
        {
            const course = await Courses.Get(paths[1]);

            if (course.length == 0)
            {
                req.filepath = "./src/pages/course_404";
                res.status(404);
            }
            else
            {
                if (isAdmin)
                    req.filepath = "./src/pages/course_admin";
                else    
                    req.filepath = "./src/pages/course";
                
                Object.assign(req.variables, 
                    {
                        "course": JSON.stringify(course[0]),
                        "course.id": course[0].id,
                        "course.name": course[0].name,
                        "course.alias": course[0].alias,
                        "course.description": course[0].description,
                        "course.sks": course[0].sks,
                        "course.semester": course[0].semester,
                    }
                );
            }
        }
        
        if (paths.length == 3)
        {        
            const course = await Courses.Get(paths[1]);
            let path = (isAdmin ? "/admin/" : "/") + paths[0] + "/" + paths[1];

            if (course.length == 0)
            {
                req.filepath = "./src/pages/course_404";
            }
            else
            {
                const url = new URL("http://127.0.0.0/?name=" + paths[2]);
                const name = url.searchParams.get("name").replaceAll("-", " ");
                const topic = await Courses.Topics.Find(course[0].id, name);
            
                if (topic)
                    path += "?id=" + topic;
            }

            return res.redirect(path);
        }

        req.isAdmin = isAdmin;
        next();
    });

    Server.post("*/courses/*", async function(req, res, next)
    {
        let paths = req.path.split("/").filter(o => o);
        const isAdmin = paths[0] == "admin";

        if (isAdmin)
            paths = paths.slice(1);

        if (paths.length == 3)
        {
            const course = await Courses.Get(paths[1]);

            if (course.length == 0)
                return res.status(404).send();

            if (isAdmin)
                req.filepath = "./src/pages/course_admin";
            else    
                req.filepath = "./src/pages/course";
            
            Object.assign(req.variables, 
                {
                    "course": JSON.stringify(course[0]),
                    "course.id": course[0].id,
                    "course.name": course[0].name,
                    "course.alias": course[0].alias,
                    "course.description": course[0].description,
                    "course.sks": course[0].sks,
                    "course.semester": course[0].semester,
                }
            );

            const topic = await Courses.Topics.Get({ topic: paths[2] });

            if (topic.length == 0)
            {
                req.filepath = "./src/pages/topic_404";
                res.status(404);
                return next();
            }
            
            if (isAdmin)
                req.filepath = "./src/pages/topic_admin";
            else    
                req.filepath = "./src/pages/topic";
            
            Object.assign(req.variables, 
                {
                    "topic": JSON.stringify(topic[0]),
                    "topic.id": topic[0].id,
                    "topic.name": topic[0].name,
                }
            );
        }
        
        req.isAdmin = isAdmin;
        next();
    })

    Server.post("/admin/courses/create", async function(req, res)
    {
        const data = req.body;

        for (const key of Object.keys(data))
            if (data[key]?.trim() == "")
                data[key] = null;

        if (data.sks)
            data.sks = parseInt(data.sks);

        if (data.semester)
            data.semester = parseInt(data.semester);

        if (data.id == null || data.name == null || data.semester == null || data.sks == null)
            return res.status(400).send("Id, name, semester, or SKS can't be empty.");

        if (isNaN(data.sks) || isNaN(data.semester))
            return res.status(400).send("Semester or SKS must be a number.");

        const existingCourse = await Courses.Get(data.id);

        if (existingCourse.length > 0)
            return res.status(400).send("Course '" + data.id + "' is already exists.");

        const success = await Courses.Add(data.id?.trim(), data.name?.trim(), data.alias?.trim(), data.description?.trim(), data.semester, data.sks);

        if (success)
            return res.send();
        else
            return res.status(500).send("Something wen't wrong.");
    });

    Server.patch("/admin/courses/update", async function(req, res)
    {
        const data = req.body;
        const oldCourse = await Courses.Get(data.oldId.trim());
        oldCourse[0].oldId = oldCourse[0].id;

        if (data.sks)
            data.sks = parseInt(data.sks);

        if (data.semester)
            data.semester = parseInt(data.semester);

        if (isNaN(data.sks) || isNaN(data.semester))
            return res.status(400).send("Semester or SKS must be a number.");

        if (oldCourse.length == 0)
            return res.status(400).send("Course '" + oldCourse[0].oldId + "' was not found.");

        const changes = {};

        for (const key of Object.keys(oldCourse[0]))
        {
            if (data[key] != oldCourse[0][key])
            {
                if (data[key]?.trim && data[key]?.trim() == "")
                    changes[key] = "@null";
                else if (typeof data[key] == "string")
                    changes[key] = data[key].trim();
                else
                    changes[key] = data[key];
            }
        }

        if (changes.id == "@null" || changes.name == "@null" || changes.semester == "@null" || changes.sks == "@null")
            return res.status(400).send("Id, name, semester, and SKS can't be empty.");
        
        const success = await Courses.Update(data.oldId, changes.id, changes.name, changes.alias, changes.description, changes.semester, changes.sks);

        for (const key of Object.keys(changes))
            if (changes[key] == "@null")
                changes[key] = null;

        if (success)
            return res.send(changes);
        else
            return res.status(500).send("Something wen't wrong.");
    });

    Server.delete("/admin/courses/delete", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, "admin") == false)
            return res.status(403).send("You don't have permission to delete a course.");

        const success = await Courses.Remove(req.body.id);

        if (success)
            return res.send();
        else
            return res.status(500).send();
    });

    Server.post("/admin/courses/setbanner", async function(req, res)
    {
        const id = req.body.id;
        const buffer = req.files.file.data;

        if (buffer.length > 2000000)
            return res.status(400).send("Maximum file size is 2MB.");
        
        const success = Courses.Banners.Save(id, buffer);
        
        if (success)
            res.send();
        else
            res.status(500).send();
    });

    Server.post("/admin/courses/clearbanner", async function(req, res)
    {
        const id = req.body.id;
        const success = Courses.Banners.Delete(id);

        if (success)
            res.send();
        else
            res.status(500).send();
    });
    
    Server.get("/topics/get", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, ["editor", "admin"]) == true)
            res.header("Cache-Control", "public, max-age=30");

        const type = req.query.type; 
        const topic = await Courses.Topics.Get(type == "topic" ? { topic: req.query.id } : { course: req.query.id });
        res.send(topic);
    });

    Server.post("/admin/topics/create", async function(req, res)
    {
        const name = req.body.name?.trim();
        const course = req.body.course?.trim();
        
        if (!name || !course)
            return res.status(400).send("Topic's name or course's id can't be empty.");

        const id = await Courses.Topics.Add(name, course);
        const topic = await Courses.Topics.Get({ topic: id });

        if (id)
            return res.status(200).send(topic[0]);
        else
            return res.status(500).send("Something wen't wrong.");
    });

    Server.patch("/admin/topics/update", async function(req, res)
    {
        const id = req.body.id?.trim();
        const name = req.body.name?.trim();
        
        if (!id || !name)
            return res.status(400).send("Topic's id or name can't be empty.");

        const success = await Courses.Topics.Update(id, name);

        if (success)
            return res.status(200).send();
        else
            return res.status(500).send("Something wen't wrong.");
    });

    Server.delete("/admin/topics/delete", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, "admin") == false)
            return res.status(403).send("You don't have permission to delete a topic.");

        const id = req.body.id?.trim();
        
        if (!id)
            return res.status(400).send("Topic's id can't be empty.");

        const success = await Courses.Topics.Remove(id);

        if (success)
            return res.status(200).send();
        else
            return res.status(500).send("Something wen't wrong.");
    });

    Server.patch("/admin/topics/reorder", async function(req, res)
    {
        const success = await Courses.Topics.Reorder(req.body.id, req.body.sort);
        
        if (success)
            return res.send();
        else
            return res.status(500).send();
    });

    Server.get("/sources/get", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, ["editor", "admin"]) == false)
            return res.status(403).send();

        const result = await Courses.Problems.Sources.Get();
        res.send(result);
    });
    
    Server.get("/problems/get", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, ["editor", "admin"]) == true)
            res.header("Cache-Control", "public, max-age=30");

        const type = req.query.type; 
        let problems = [];

        if (type == "problem")
            problems = await Courses.Problems.Get({ problem: req.query.id });
        else if (type == "course")
            problems = await Courses.Problems.Get({ course: req.query.id });
        else if (type == "topic")
            problems = await Courses.Problems.Get({ topic: req.query.id });

        res.send(problems);
    });

    Server.post("/admin/problems/create", async function(req, res)
    {
        const data = req.body;

        for (const key of Object.keys(data))
            if (data[key]?.trim() == "")
                data[key] = null;

        if (data.year)
            data.year = parseInt(data.year);
        
        if (data.question == null || data.source == null || data.year == null)
            return res.status(400).send("Question, source, and year can't be empty.");

        if (data.topic == null || data.course == null)
            return res.status(400).send("Topic and course can't be empty.");

        if (isNaN(data.year))
            return res.status(400).send("Year must be a number.");

        const id = await Courses.Problems.Add(data.question?.trim(), data.solution?.trim(), data.source?.trim(), data.year, data?.topic.trim(), data.course?.trim());
        const problem = await Courses.Problems.Get({ problem: id });

        if (id)
            return res.send(problem[0]);
        else
            return res.status(500).send();
    });

    Server.patch("/admin/problems/update", async function(req, res)
    {
        const data = req.body;
        const keys = ["id", "question", "solution", "source", "year", "topic", "course"];

        if (data.year)
            data.year = parseInt(data.year);

        if (isNaN(data.year))
            return res.status(400).send("Year must be a number.");

        for (const key of keys)
            if (data[key] == null || (data[key]?.trim && data[key]?.trim() == ""))
                data[key] = "@null";
            else if (typeof data[key] == "string")
                data[key] = data[key].trim();

        if (data.question == "@null" || data.source == "@null" || data.source.id == null)
            return res.status(400).send("Question and source can't be empty.");

        if (data.id == "@null")
            return res.status(400).send("Id can't be empty.");
        
        const success = await Courses.Problems.Update(data.id, data.question, data.solution, data.source.id, data.year);

        if (success)
            return res.send();
        else
            return res.status(500).send();
    });

    Server.delete("/admin/problems/delete", async function(req, res)
    {
        if (await Authentication.HasAccess(req.session.account, ["admin", "editor"]) == false)
            return res.status(403).send("You don't have permission to delete a course.");
        
        const id = req.body.id?.trim();
        
        if (!id)
            return res.status(400).send("Problem's id can't be empty.");

        const success = await Courses.Problems.Remove(id);

        if (success)
            return res.status(200).send();
        else
            return res.status(500).send("Something wen't wrong.");
    });

    Map(Server);
}

/**
 * Map all files inside `./public` folder
 * @param { import("express").Application } Server Express instance
 * @returns { void }
 */
function Map(Server)
{
    Server.get("*", async function(req, res)
    {
        const prettyPath = PrettifyPath(req);
        const path = prettyPath.result;
        
        if (prettyPath.refresh)
        {
            res.redirect("/" + prettyPath.result);
            return;
        }
        
        const rootPath = req.filepath ? "" : "./public/";
        const isHTML = FileIO.existsSync(rootPath + path + ".html") || FileIO.existsSync(rootPath + path + "/index.html");
        const isIndex = isHTML ? FileIO.existsSync(rootPath + path + ".html") == false : false;
        const isImage = /(\.png|\.webp|\.jpg|\.bmp|\.jpeg)$/g.test(path);
        const pageType = path.startsWith("admin") || req.isAdmin == true ? "admin" : "public";

        if (isHTML)
        {
            let data;
            if (isIndex)
                data = FileIO.readFileSync(rootPath + path + "/index.html");
            else
                data = FileIO.readFileSync(rootPath + path + ".html");

            data = data.toString();
            data = Functions.Page_Compile(pageType, data, req.session?.language, path, false);
            
            if (req.variables)
                for (const variable of Object.keys(req.variables))
                    data = data.replace(new RegExp("<#\\?(| )" + variable + "(| )\\?#>", "gi"), req.variables[variable] || "");
            
            res.send(data);
        }
        else
        {
            if (FileIO.existsSync(rootPath + path))
            {
                res.sendFile(rootPath + path, { root: "./" });
            }
            else
            {
                if (isImage)
                    res.status(404).sendFile("./src/blank.png", { root: "./" });
                else
                    res.status(404).sendFile("./public/404.shtml", { root: "./" });
            }
        }
    });
    
    Server.post("*", async function(req, res, next)
    {
        let path = PrettifyPath(req).result;
        
        const rootPath = req.filepath ? "" : "./public/";
        const isHTML = FileIO.existsSync(rootPath + path + ".html") || FileIO.existsSync(rootPath + path + "/index.html");
        const isIndex = isHTML ? FileIO.existsSync(rootPath + path + ".html") == false : false;
        const pageType = path.startsWith("admin") || req.isAdmin == true ? "admin" : "public";

        if (isHTML)
        {
            let data;
            if (isIndex)
                data = FileIO.readFileSync(rootPath + path + "/index.html");
            else
                data = FileIO.readFileSync(rootPath + path + ".html");

            data = data.toString();
            data = Functions.Page_Compile(pageType, data, req.session?.language, path, true);
            
            if (req.variables)
                for (const variable of Object.keys(req.variables))
                    data = data.replace(new RegExp("<#\\?(| )" + variable + "(| )\\?#>", "gi"), req.variables[variable] || "");
            
            res.send(data);
        }
        else
        {
            if (FileIO.existsSync(rootPath + path))
            {
                res.sendFile(rootPath + path, { root: "./" });
            }
            else
            {
                res.status(404).send();
            }
        }
    });
}

/**
 * Make the URL tidy
 * @param { string } path
 * @returns { {
 *      refresh: boolean,
 *      result: string
 * }} 
 */
function PrettifyPath(req)
{
    if (req.filepath)
        return {
            refresh: false,
            result: req.filepath
        };

    let path = req.path;
    let refresh = false;

    if (path.startsWith("//"))
        refresh = true;

    while (path.startsWith("/"))
        path = path.substring(1);

    if (path.includes("//"))
    {
        refresh = true;
        path = path.replaceAll("//", "/");
    }
    if (path.endsWith("/"))
    {
        refresh = true;
        path = path.substring(0, path.length - 1);
    }
    if (path.endsWith(".html"))
    {
        refresh = true;
        path = path.substring(0, path.length - 5);
    }
    if (path.endsWith(".shtml"))
    {
        refresh = true;
        path = path.substring(0, path.length - 6);
    }
    if (Language.Available.includes(path.split("/")[0]))
    {
        const language = path.split("/")[0];
        req.session.saved = true;
        req.session.language = language;
        path = path.split("/").splice(1).join("/");
        refresh = true;
    }

    return {
        refresh: refresh, 
        result: path
    }
}

module.exports = Route;