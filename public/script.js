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
                if (Topics.IsOpened())
                    window.history.back();

                window.history.back();
            }
            else
            {
                window.location.href = origin + "/courses/";
            }
        }
        else
        {
            window.location.href = origin + "/courses/";
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
            if (child == "hover")       return hover;
            if (child == "banner")      return banner;
            if (child == "id")          return id;
            if (child == "name")        return name;
            if (child == "description") return description;
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
                context.commands[1].Title = "<$ courses context_unpin_template />".format(course.alias || course.name);
            }
            else
            {
                context.commands[1].Show = false;
                context.commands[0].Show = true;
                context.commands[0].Title = "<$ courses context_pin_template />".format(course.alias || course.name);
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
            if (window['Grid_PinnedCourses'] == null)
                return;

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
                    context.commands[1].Title = "<$ courses context_unpin />";
            
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
            const problems = await $.get("/problems/get?id=" + topic.id + "&type=topic", "/problems/get");
            
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
            Title: "<$ courses context_open_in_new_tab />",
            Icon: "fbc1",
            Action: (element) => { window.open("/courses/" + element.data.id) }
        }
    ]);
Components.ContextMenu.Add("Course_More", 
    [
        {
            Title: "<$ courses context_pin />",
            Show: o => Courses.Pins.Includes(Courses.Active.id) == false,
            Icon: "f892",
            Action: o => Courses.Pins.Add(Courses.Active.id, Courses.Active.name)
        },
        {
            Title: "<$ courses context_unpin />",
            Show: o => Courses.Pins.Includes(Courses.Active.id) == true,
            Icon: "f88f",
            Action: o => Courses.Pins.Remove(Courses.Active.id)
        },
        {
            Title: "<$ courses context_print />",
            Icon: "f948",
            Action: function (element) 
            { 
                PopOver_PrintAll.open(element); 
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
    Back: function(ignorePopState = false)
    {
        if (Topics.IsOpened())
        {
            Activity_Topic.remove();

            if (ignorePopState == false)
                window.history.back();
        }

        for (const box of [...Grid_CourseTopics.children])
            box.classList.remove("active");
        
        Topics.Active = null;
    },
    Loading: function(topic)
    {
        if (Topics.IsOpened())
            Activity_Topic.remove();

        const title = document.createElement("div");
        title.classList.add("title");
        title.classList.add("hide");

        const back = document.createElement("button");
        back.classList.add("back");
        back.innerHTML = "<$ topics back />";
        back.onclick = Topics.Back;

        const buttons = document.createElement("buttons");
        buttons.classList.add("buttons");
        buttons.append(back);

        const header = document.createElement("div");
        header.classList.add("header");
        header.classList.add("cascaded");
        header.appendChild(buttons);
        header.appendChild(title);

        const h3 = document.createElement("h3");
        h3.innerText = topic.name;

        const progressring = document.createElement("div");
        progressring.classList.add("progressring");

        const problems = document.createElement("div");
        problems.setAttribute("id", "Grid_CourseProblems");
        problems.appendChild(progressring);

        const content = document.createElement("div");
        content.classList.add("content");
        content.appendChild(h3);
        content.appendChild(problems);

        const activity = document.createElement("div");
        activity.classList.add("activity"); 
        activity.setAttribute("id", "Activity_Topic");
        activity.appendChild(header);
        activity.appendChild(content);

        $(".root > .main").append(activity);
    },
    Open: function(topic, ignorePopState = false)
    {
        const url = new URL(window.location.href);
        let path = url.pathname;
        path = path.substring(0, path.indexOf("courses")) + "courses/" + topic.course;

        Topics.Back();
        // Topics.Loading(topic);

        const box = [...Grid_CourseTopics.children].find(o => o.data.id == topic.id);
        box?.classList.add("active");

        const activity = document.createElement("div");
        activity.classList.add("activity"); 
        activity.setAttribute("id", "Activity_Topic");

        const output = function(page)
        {
            Topics.Active = topic;
            url.searchParams.set("name", topic.name);
            const name = url.search.replace("?name=", "").replaceAll("+", "-").replaceAll("---", "-").toLowerCase();

            if (ignorePopState == false)
                window.history.pushState({ page: "problems", topic: topic }, null, path + "/" + name);

            activity.innerHTML = page;
            $(".root > .main").append(activity);
        }

        $.ajax({
            type: "post",
            url: path + "/" + topic.id,
            success: function(page)
            {
                output(page);
            },
            error: function(page)
            {
                output(page.responseText);
            }
        });
    },
    Render: function(topic)
    {
        const name = document.createElement("span");
        name.classList.add("name");
        name.append(topic.name);

        const problemcount = document.createElement("span");
        problemcount.classList.add("problemcount");
        problemcount.append("<$ topics problems_label />".format(topic.problemcount));
        
        const lastedited = document.createElement("span");
        lastedited.classList.add("lastedited");

        if (topic.lastedited)
        {
            const t1 = parseInt(topic.lastedited);
            const t2 = new Date(Date.now() - topic.lastedited);
            const time = t1 == 0 ? 0 : t2 > 1000 * 3600 * 24 * 6 ? moment(t1).format("ll") : moment(t1).fromNow();
            lastedited.append("<$ topics updated_label />".format(time));
        }

        const details = document.createElement("div");
        details.classList.add("details");
        details.append(problemcount);
        details.append(lastedited);

        const box = document.createElement("div");
        box.classList.add("topic");
        box.append(name);
        box.append(details);
        box.find = function(child)
        {
            if (child == "name")            return name;
            if (child == "problemcount")    return problemcount;
            if (child == "lastedited")      return lastedited;
        }
        box.data = topic;
        box.onclick = function()
        {
            if (box.classList.contains("active"))
                return;

            Topics.Open(topic);
        }

        if (topic.id == PendingId)
        {   
            Topics.Open(topic);
            box.classList.add("active");
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
            const renderedLatex = await MathJax.tex2chtmlPromise(latex.innerText);
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
            year.append("(" + group.data.year + "-" + (group.data.year + 1) + ")");

            const source = document.createElement("span");
            source.classList.add("source");
            source.append(JSON.parse(`<$ problems sources />`)[group.data.source.id]);

            const details = document.createElement("div");
            details.classList.add("details");
            details.append(source);
            details.append(year);

            group.append(details);
            container.append(group);
        }

        const oldGroup = problem.parentNode;
        group.append(problem);

        // removes empty group
        if (oldGroup?.children?.length == 1)
            oldGroup.remove();

        return group;
    },
    Sort: function(container)
    {                   
        let sorted;
        const classes = container.children[0]?.classList;

        if (classes.contains("problem") || classes.contains("details"))
        {
            const children = [...container.children].filter(o => o.data != null);
            sorted = children.sort((a,b) => a.data.id - b.data.id);
        }
        else if (classes.contains("group"))
        {
            const children = [...container.children];
            sorted = children
                        .sort((a,b) => b.data.source.id - a.data.source.id)
                        .sort((a,b) => b.data.year - a.data.year);
        }

        sorted.forEach(o => container.appendChild(o));
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
            const date = new Date(latest).toLocaleDateString(document.documentElement.lang, 
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
        if (Topics.Active.lastedited > 0)
        {
            const date = new Date(Topics.Active.lastedited).toLocaleDateString(document.documentElement.lang, 
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

        Text_PrintCourseName.innerText = Courses.Active.name;
        Text_PrintTopicName.innerText = Topics.Active.name;
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

const mathBlockExtension = 
{
    name: "mathblock",
    level: "block",
    start(src) 
    {
        return src.indexOf("$$");
    },
    tokenizer(src, tokens) 
    {
        const match = src.match(/^\$\$\s*([\s\S]+?)\s*\$\$/);
        if (!match) return;
        return {
            type: "mathblock",
            raw: match[0],
            text: match[1].trim(),
            tokens: []
        };
    },
    renderer(token) 
    {
        return `<math-latex block>${token.text}</math-latex>`;
    }
};

const letterListExtension = 
{
    name: "letterlist",
    level: "block",
    start(src) 
    {
        return src.match(/^[a-zA-Z]\. /m)?.index;
    },
    tokenizer(src, tokens) 
    {
        if (/^\$\$/.test(src)) return;

        const regex = /^([a-zA-Z])\. .*(\n[a-zA-Z]\. .*)*/;
        const match = src.match(regex);
        if (!match) return;

        const raw = match[0];
        const lines = raw.split('\n');

        const isValid = lines.every(line => /^[a-zA-Z]\. /.test(line));
        if (!isValid) return;

        const items = lines.map(line => 
        {
            const content = line.replace(/^[a-zA-Z]\. /, '').trim();
            return this.lexer.blockTokens(content);
        });

        return {
            type: "letterlist",
            raw,
            items
        };
    },
    renderer(token) 
    {
        const rendered = token.items.map(itemTokens => 
        {
            const html = marked.parser(itemTokens);
            return `<li>${html}</li>`;
        }).join("");
        return `<ol type="a">${rendered}</ol>`;
    }
};

window.addEventListener("popstate", function()
{
    if (window.history.state?.page == "problems")
    {
        Topics.Open(window.history.state.topic, true);
    }
    else if (Topics.IsOpened())
    {
        Topics.Back(true);
    }
    else
    {
        CheckAccent();
        CheckTheme();
        Courses.Pins.AppendSidebar();
    }
})

marked.use({ extensions: [letterListExtension, mathBlockExtension, mathExtension] });

if (document.documentElement.lang == "kr")
    moment.locale("ko");
else if (document.documentElement.lang == "jp")
    moment.locale("ja");
else
    moment.locale(document.documentElement.lang);