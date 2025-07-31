let PendingId = null;

{
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    
    if (id)
    {
        PendingId = id;
        url.searchParams.delete("id");
        window.history.replaceState(null, null, url.href);
    }
}

const Courses = 
{
    Active: null,
    Back: function(origin = "")
    {
        if (document.referrer)
        {
            const urlPrev = new URL(document.referrer);
            const urlNow = new URL(location.href);

            if (urlPrev.origin == urlNow.origin && urlPrev.pathname == origin + "/courses")
            {
                window.history.back();
            }
            else
            {
                window.location.href = origin + "/courses/";
            }
        }
    },
    Render: function(course)
    {
        const hover = document.createElement("div");
        hover.classList.add("hover");

        const banner = document.createElement("img");
        banner.classList.add("banner");
        banner.src = "/banner/" + course.id;

        const id = document.createElement("span");
        id.classList.add("id");
        id.append(course.id);

        const name = document.createElement("span");
        name.classList.add("name");
        name.append(course.name);

        const description = document.createElement("span");
        description.classList.add("description");
        description.append(course.description || "");

        const box = document.createElement("div");
        box.classList.add("course");
        box.append(hover);
        box.append(banner);
        box.append(id);
        box.append(name);
        box.append(description);

        box.find = function(child)
        {
            if (child == "hover")        return hover;
            if (child == "banner")       return banner;
            if (child == "id")           return id;
            if (child == "name")         return name;
            if (child == "description")  return description;
        }
        box.setAttribute("goto", "courses/" + course.id);
        box.data = course;
        box.oncontextmenu = function(event)
        {
            const context = Components.ContextMenu.List.find(o => o.id == "Course");

            if (Courses.Pins.Includes(course.id))
            {
                context.commands[0].Show = false;
                context.commands[1].Show = true;
                context.commands[1].Title = "Unpin “" + (course.alias || course.name) + "”";
            }
            else
            {
                context.commands[1].Show = false;
                context.commands[0].Show = true;
                context.commands[0].Title = "Pin “" + (course.alias || course.name) + "”";
            }
            Components.ContextMenu.Open("Course", box, event);
        }

        return box;
    },
    Append: function(courses, container)
    {
        for (const course of courses)
        {
            const box = Courses.Render(course);
            container.append(box);
        }
    },
    Pins: 
    {
        Get: function()
        {
            let pins = localStorage.getItem("courses_pins");

            if (!pins)
            {
                pins = "[]";
                localStorage.setItem("courses_pins", pins);
            }

            return JSON.parse(pins);
        },
        Add: function(id, name)
        {
            const pins = Courses.Pins.Get();
            pins.push({ id, name });
            localStorage.setItem("courses_pins", JSON.stringify(pins));
            Courses.Pins.AppendSidebar();
        },
        Remove: function(id)
        {
            let pins = Courses.Pins.Get();
            pins = pins.filter(o => o.id != id);
            localStorage.setItem("courses_pins", JSON.stringify(pins));
            Courses.Pins.AppendSidebar();
        },
        Toggle: function(id, name)
        {
            if (Courses.Pins.Includes(id))
                Courses.Pins.Remove(id);
            else
                Courses.Pins.Add(id, name);
        },
        Includes: function(id)
        {
            return Courses.Pins.Get().find(o => o.id == id) != null;
        },
        AppendSidebar: function()
        {
            const pins = Courses.Pins.Get();
            Grid_PinnedCourses.innerHTML = "";

            for (let pin of pins)
            {
                const icon = document.createElement("span");
                icon.classList.add("icon");
                icon.append("\ued7e")

                const name = document.createElement("span");
                name.append(pin.name);

                const a = document.createElement("a");
                a.setAttribute("goto", "/courses/" + pin.id);
                a.append(icon);
                a.append(name);
                a.data = pin;

                if (pin.name.length > 25)
                    a.setAttribute("ad-tooltip", pin.name);

                Grid_PinnedCourses.append(a);

                a.oncontextmenu = function(event)
                {
                    const context = Components.ContextMenu.List.find(o => o.id == "Course");
                    context.commands[0].Show = false;
                    context.commands[1].Show = true;
                    context.commands[1].Title = "Unpin";
            
                    Components.ContextMenu.Open("Course", a, event);
                }
            }
        }
    },
    Print: async function()
    {
        Grid_PrintContent.innerHTML = "";
        
        const topics = [...Grid_PrintCourseTopics.children].filter(o => o.checkbox.checked == true).map(o => o.data);
        const container = new DocumentFragment();

        for (const topic of topics)
        {
            const problems = await $.post("/problems/get", { id: topic.id, type: "topic" } ,"/problems/get");
            
            const section = document.createElement("section");

            const title = document.createElement("h3");
            title.innerText = topic.name;
            section.append(title);

            await Problems.Append(problems, section);

            container.append(section);
        }

        Courses.PendingPrint = 
        {
            topics: topics.map(o => {
                const topic = document.createElement("span");
                topic.append(o.name);
                topic.data = o;

                return topic;
            }),
            content: container
        };
    },
    PendingPrint: null,
    FetchBanner: async function(id, disableCache = false)
    {
        const response = await fetch("/banner/" + id + (disableCache ? "?cache=false" : ""));
        const blob = await response?.blob();

        if (response.ok == false || blob == null)
            return "";
        
        return URL.createObjectURL(blob);
    }
}

Components.ContextMenu.Add("Course", 
    [
        {
            Show: false,
            Icon: "f892",
            Action: (element) => { Courses.Pins.Add(element.data.id, element.data.name) }
        },
        {
            Show: false,
            Icon: "f88f",
            Action: (element) => { Courses.Pins.Remove(element.data.id) }
        },
        {
            Title: "Open in new tab",
            Icon: "fbc1",
            Action: (element) => { window.open("/courses/" + element.data.id) }
        }
    ]);
Components.ContextMenu.Add("Course_More", 
    [
        {
            Title: "Pin",
            Show: o => Courses.Pins.Includes(Courses.Active.id) == false,
            Icon: "f892",
            Action: o => Courses.Pins.Add(Courses.Active.id, Courses.Active.name)
        },
        {
            Title: "Unpin",
            Show: o => Courses.Pins.Includes(Courses.Active.id) == true,
            Icon: "f88f",
            Action: o => Courses.Pins.Remove(Courses.Active.id)
        },
        {
            Title: "Print...",
            Icon: "f948",
            Action: function (element) 
            { 
                Grid_PrintCourseTopics.innerHTML = "";
                for (const item of [...Grid_CourseTopics.children])
                {
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";

                    const box = Topics.Render(item.data);
                    box.onclick = function()
                    {
                        const checkes = [...Grid_PrintCourseTopics.children].filter(o => o.checkbox.checked == true);

                        if (checkes.length < 5 || box.checkbox.checked == true)
                            checkbox.click();
                    }

                    box.prepend(checkbox);
                    box.checkbox = checkbox;
                    Grid_PrintCourseTopics.append(box);
                }
                PopOver_PrintAll.Open(element); 
            }
        }
    ]);

const Topics = 
{
    Active: null,
    IsOpened: function()
    {
        return window['Activity_Topic'] != null;
    },
    Back: function()
    {
        if (Topics.IsOpened())
            Activity_Topic.remove();

        for (const box of [...Grid_CourseTopics.children])
            box.classList.remove("active");
        
        const url = new URL(window.location.href);
        const course = url.pathname.match(/courses\/(.*?)\//gi);
        let path = url.pathname;
        path = path.substring(0, path.indexOf("courses")) + course;
        window.history.replaceState(null, null, path);
        Topics.Active = null;
    },
    Render: function(topic)
    {
        const name = document.createElement("span");
        name.classList.add("name");
        name.append(topic.name);

        const problemcount_title = document.createElement("span");
        problemcount_title.append("Problems:");

        const problemcount = document.createElement("span");
        problemcount.classList.add("problemcount");
        problemcount.append(topic.problemcount);

        const problemcount_container = document.createElement("div");
        problemcount_container.append(problemcount_title);
        problemcount_container.append(problemcount);

        const lastedited_title = document.createElement("span");
        lastedited_title.append("Updated");
                    
        const t1 = parseInt(topic.lastedited);
        const t2 = new Date(Date.now() - topic.lastedited);
        const time = t1 == 0 ? 0 : t2 > 1000 * 3600 * 24 * 6 ? moment(t1).format("ll") : moment(t1).fromNow();

        const lastedited = document.createElement("span");
        lastedited.classList.add("lastedited");
        lastedited.append(time || "");

        const lastedited_container = document.createElement("div");
        lastedited_container.append(lastedited_title);
        lastedited_container.append(lastedited);

        const details = document.createElement("div");
        details.classList.add("details");
        details.append(problemcount_container);
        details.append(lastedited_container);

        const box = document.createElement("div");
        box.classList.add("topic");
        box.append(name);
        box.append(details);
        box.find = function(child)
        {
            if (child == "name")  return name;
            if (child == "problemcount")  return problemcount;
            if (child == "lastedited")  return lastedited;
        }
        box.data = topic;
        box.onclick = function()
        {
            if (box.classList.contains("active"))
                return;

            const activity = document.createElement("div");
            activity.classList.add("activity"); 
            activity.setAttribute("id", "Activity_Topic");

            const url = new URL(window.location.href);
            let path = url.pathname;
            path = path.substring(0, path.indexOf("courses")) + "courses/" + topic.course;

            $.ajax({
                type: "post",
                url: path + "/" + topic.id,
                success: function(page)
                {
                    Topics.Back();

                    Topics.Active = topic;
                    url.searchParams.set("name", topic.name);
                    const name = url.search.replace("?name=", "").replaceAll("+", "-").replaceAll("---", "-").toLowerCase();
                    window.history.replaceState(null, null, path + "/" + name);

                    box.classList.add("active");

                    activity.innerHTML = page;
                    $(".root > .main").append(activity);
                }
            });
        }

        if (topic.id == PendingId)
        {
            box.click();
            PendingId = null;
        }

        return box;
    },
    Append: async function(topics, container)
    {
        for (const topic of topics)
        {
            const box = Topics.Render(topic);
            container.append(box);
        }
        
        if (window["Grid_Print"] == null)
        {
            const data = await $.post("/print");
            Components.AddToContainer(data);
        }
    }
}

const Problems = 
{
    Render: async function(problem)
    {
        const text = document.createElement("div");
        text.classList.add("text");
        text.innerHTML = await Problems.ParseMarkdownLatex(problem.question);

        const box = document.createElement("div");
        box.classList.add("problem");
        box.append(text);
        box.data = problem;

        return box;
    },
    Append: async function(problems, container)
    {
        for (const problem of problems)
        {
            const box = await Problems.Render(problem);
            Problems.AddToGroup(box, container);
        }
    },
    ParseMarkdownLatex: async function(string)
    {
        const result = document.createElement("template");
        result.innerHTML = marked.parse(string);

        const latexes = result.content.querySelectorAll("math-latex");
        
        for (const latex of latexes)
        {
            MathJax.texReset();
            const renderedLatex = await MathJax.tex2chtmlPromise(latex.innerHTML);
            latex.parentNode.replaceChild(renderedLatex, latex);
            MathJax.startup.document.clear();
            MathJax.startup.document.updateDocument();
        }

        return result.innerHTML;
    },
    AddToGroup: function(problem, container)
    {
        let group;
        for (const child of [...container.children])
        {
            if (child.data?.year == problem.data.year && child.data?.source.id == problem.data.source.id)
            {
                group = child;
                break;
            }
        }

        if (group == null)
        {
            group = document.createElement("div");
            group.classList.add("group");
            group.data = 
            {
                year: problem.data.year,
                source: problem.data.source
            };

            const year = document.createElement("span");
            year.classList.add("year");
            year.append("(" + group.data.year + " - " + (group.data.year + 1) + ")");

            const source = document.createElement("span");
            source.classList.add("source");
            source.append(group.data.source.name);

            const details = document.createElement("div");
            details.classList.add("details");
            details.append(source);
            details.append(year);

            group.append(details);
            container.append(group);
        }

        group.append(problem);
        return group;
    },
    Sort: function(container)
    {
        const sorted = 
            Array.from(container.children)
                .sort((a,b) => b.data.source.id - a.data.source.id)
                .sort((a,b) => b.data.year - a.data.year);

        sorted.forEach(element => container.appendChild(element));
    }
}

window.onbeforeprint = async function(event)
{    
    if (Courses.PendingPrint)
    {
        let latest = 0;

        Text_PrintCourseName.innerText = Courses.Active.name;
        Text_PrintTopicName.innerHTML = "";

        for (const topic of Courses.PendingPrint.topics)
        {
            Text_PrintTopicName.append(topic);
            if (topic.data.lastedited > latest)
                latest = topic.data.lastedited;
        }

        if (latest > 0)
        {
            const date = new Date(latest).toLocaleDateString("id", 
            {
                year: "numeric",
                month: "long",
                day: "numeric",
            });

            Text_Date.innerText = date;
        }
        else
        {
            Text_Date.innerText = "";
        }

        Grid_PrintContent.append(Courses.PendingPrint.content);
    }
    else
    {
        const date = new Date(Topics.Active.lastedited).toLocaleDateString("id", 
        {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        Text_PrintCourseName.innerText = Courses.Active.name;
        Text_PrintTopicName.innerText = Topics.Active.name;
        Text_Date.innerText = date;
        Grid_PrintContent.innerHTML = Grid_CourseProblems.innerHTML;
        
        const title = document.createElement("h3");
        title.innerText = Topics.Active.name;
        Grid_PrintContent.prepend(title);
    }
        
    Courses.PendingPrint = false;
}

const mathExtension = 
{
    name: "math",
    level: "inline",
    start(src) 
    {
        return src.indexOf("$");
    },
    tokenizer(src) 
    {
        const match = src.match(/^\$([^\$\n]+?)\$/);
        if (!match) 
            return;
        return {
            type: "math",
            raw: match[0],
            text: match[1],
            tokens: []
        };
    },
    renderer(token) 
    {
        return `<math-latex>${token.text}</math-latex>`;
    }
};

marked.use({ extensions: [mathExtension] });