const Courses = 
{
    Active: null,
    Back: function(origin = "")
    {
        if (document.referrer)
        {
            const urlPrev = new URL(document.referrer);
            const urlNow = new URL(location.href);

            if (urlPrev.origin == urlNow.origin && window.history.length > 2)
            {
                if (urlPrev.pathname == origin + "/courses" || urlPrev.pathname == origin + "/home" || urlPrev.pathname == origin + "/pins" || urlPrev.pathname == origin + "/search")
                {
                    if (Topics.IsOpened() && window['PendingId'] != -1)
                        window.history.back();

                    return window.history.back();
                }
            }
        }

        window.location.href = origin + "/courses/";
    },
    Label: function(element, origin = "")
    {
        if (document.referrer)
        {
            const urlPrev = new URL(document.referrer);
            const urlNow = new URL(location.href);

            if (urlPrev.origin == urlNow.origin)
            {
                if (urlPrev.pathname == origin + "/home")
                    return element.innerText = "<$ home title />";

                if (urlPrev.pathname == origin + "/search")
                    return element.innerText = "<$ search title />";
                
                if (urlPrev.pathname == origin + "/pins")
                    return element.innerText = "<$ courses pinned />";
            }
        }
            
        element.innerText = "<$ courses title />";
    },
    Render: function(course)
    {
        const hover = document.createElement("div");
        hover.classList.add("hover");

        const banner = document.createElement("img");
        banner.classList.add("banner");
        banner.src = "/banner/" + course.id + "?v=" + course.bannerversion;

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
                context.commands[1].Title = "<$ courses unpin_template />".format(course.alias || course.name);
            }
            else
            {
                context.commands[1].Show = false;
                context.commands[0].Show = true;
                context.commands[0].Title = "<$ courses pin_template />".format(course.alias || course.name);
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

            {
                const description = box.find("description");    
                const lineHeight = parseFloat(getComputedStyle(description).lineHeight);
                const maxHeight = description.clientHeight;
                const lines = Math.floor(maxHeight / lineHeight);
                description.style.webkitLineClamp = lines;
            }
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
                    context.commands[1].Title = "<$ courses unpin />";
            
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
            const problems = await $.get("/problems/get/" + topic.id + "?type=topic", "/problems/get");
            
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

        const blur = await Image_Blur("/banner/" + id + (disableCache ? "?cache=false" : ""));
        
        return [URL.createObjectURL(blob), blur];
    }
}

Components.ContextMenu.Add("Courses",  
    [
        "separator",
        {
            Title: "<$ courses filter_sortby />",
            Icon: "eb8b",
            Submenu: 
            [
                {
                    value: "default",
                    Title: "<$ courses filter_default />",
                    Checked: true,
                    Action: o => Sort_Change("default")
                },
                {
                    value: "name",
                    Title: "<$ generic name />",
                    Action: o => Sort_Change("name")
                },
                {
                    value: "sks",
                    Title: "<$ generic sks />",
                    Action: o => Sort_Change("sks")
                }
            ]
        }
    ]);
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
            Title: "<$ courses link_copy />",
            Icon: "f5cc",
            Action: (element) => 
            {     
                navigator.clipboard?.writeText("https://drill.agapedimas.com/courses/" + element.data.id);
            }
        },
        {
            Title: "<$ courses newtab />",
            Icon: "fbc1",
            Action: (element) => { window.open("/courses/" + element.data.id) }
        }
    ]);
Components.ContextMenu.Add("Course_More", 
    [
        {
            Title: "<$ courses pin />",
            Show: o => Courses.Pins.Includes(Courses.Active.id) == false,
            Icon: "f892",
            Action: o => Courses.Pins.Add(Courses.Active.id, Courses.Active.name)
        },
        {
            Title: "<$ courses unpin />",
            Show: o => Courses.Pins.Includes(Courses.Active.id) == true,
            Icon: "f88f",
            Action: o => Courses.Pins.Remove(Courses.Active.id)
        },
        {
            Title: "<$ courses link_copy />",
            Icon: "f5cc",
            Action: (element) => 
            {     
                navigator.clipboard?.writeText("https://drill.agapedimas.com/courses/" + Courses.Active.id);
            }
        },
        {
            Title: "<$ generic print_bulk />",
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
    Request: null,
    Timeout: null,
    IsLoaded: false,
    Back: function(ignorePopState = false, isLoading = false)
    {
        if (Topics.Request)
        {
            Topics.Request.abort();
            Topics.Request = null;
        }

        if (Topics.IsOpened() && Topics.Active)
        {
            if (isLoading == false)
                Activity_Topic.remove();
            
            if (ignorePopState == false)
                window.history.back();
        }

        if (Topics.Active)
        {
            for (const box of [...Grid_CourseTopics.children])
                box.classList.remove("active");
            
            Topics.Active = null;
        }
    },
    Template: function()
    {
        const back = document.createElement("button");
        back.classList.add("back");
        back.innerHTML = "<$ generic back />";
        back.onclick = Topics.Back;
        
        const buttons = document.createElement("div");
        buttons.classList.add("buttons");
        buttons.append(back);

        const title = document.createElement("div");
        title.classList.add("title");

        const header = document.createElement("div");
        header.classList.add("header");   
        header.append(buttons);
        header.append(title);

        const problems = document.createElement("div");
        problems.setAttribute("id", "Grid_CourseProblems");

        const content = document.createElement("div");
        content.classList.add("content");
        content.append(problems);

        const container = new DocumentFragment();
        container.append(header);
        container.append(content);

        return container;
    },
    Loading: function(topic)
    {
        clearTimeout(Topics.Timeout);
        Topics.Back(true, true);

        Topics.Timeout = setTimeout(function()
        {
            const progressring = document.createElement("div");
            progressring.classList.add("progressring");

            if (Topics.IsOpened() == false)
            {
                const activity = document.createElement("div");
                activity.classList.add("activity"); 
                activity.setAttribute("id", "Activity_Topic");
                activity.append(Topics.Template());
                
                Topics.IsLoaded = false;
                $(".root > .main").append(activity);
            }

            Activity_Topic.name = topic.name;
            Grid_CourseProblems.innerHTML = "";
            Grid_CourseProblems.append(progressring);
        }, 500);
    },
    Open: function(topic, ignorePopState = false)
    {
        if (Topics.Request != null)
            Topics.Request.abort();
        
        Topics.Loading(topic);
        Topics.Active = topic;
        
        const url = new URL(window.location.href);
        let path = url.pathname;
        path = path.substring(0, path.indexOf("courses")) + "courses/" + topic.course;
        url.searchParams.set("name", topic.name);
        const name = url.search.replace("?name=", "").replaceAll("+", "-").replaceAll("---", "-").toLowerCase();

        if (ignorePopState == false)
        {
            if (Topics.IsOpened())
                window.history.replaceState({ page: "problems", topic: topic }, null, path + "/" + name);
            else
                window.history.pushState({ page: "problems", topic: topic }, null, path + "/" + name);
        }

        const box = [...Grid_CourseTopics.children].find(o => o.data.id == topic.id);
        box?.classList.add("active");

        const output = function(result)
        {
            clearTimeout(Topics.Timeout);

            if (Topics.IsOpened() == false || Topics.IsLoaded == false)
            {
                if (Topics.IsOpened())
                    Activity_Topic.remove();

                const activity = document.createElement("div");
                activity.classList.add("activity"); 
                activity.setAttribute("id", "Activity_Topic");

                if (result.data)
                    activity.innerHTML = result.data;
                else
                    activity.append(Topics.Template());

                $(".root > .main").append(activity);
                Topics.IsLoaded = true;
            }
                
            Activity_Topic.name = topic.name;
            Grid_CourseProblems.innerHTML = "";

            if (result.success == false)
            {
                Activity_Topic.name = "";

                if (result.status == 404)
                    Grid_CourseProblems.setAttribute("class", "notfound");
                else if (result.status == 0)
                    Grid_CourseProblems.setAttribute("class", "offline");
                else
                    Grid_CourseProblems.setAttribute("class", "unknownerror");
            }
            else
            {
                Grid_CourseProblems.removeAttribute("class");
            }
        }

        Topics.Request = $.ajax({
            type: "post",
            url: path + "/" + topic.id,
            success: function(page)
            {
                Topics.Request = $.ajax(
                {
                    type: "get",
                    url: "/problems/get/" + topic.id+ "?type=topic",
                    success: function(problems)
                    {
                        Topics.Request = null;
                        output({ success: true, data: page });
                        Problems.Append(problems, Grid_CourseProblems);
                        Grid_CourseProblems.scrollTop = 0;
                    },
                    error: function(data)
                    {
                        Topics.Request = null;

                        if (data.statusText == "abort")
                            return;
                        
                        output({ success: false, status: data.status});
                    }
                });
            },
            error: function(data)
            {
                Topics.Request = null;

                if (data.statusText == "abort")
                    return;

                output({ success: false, status: data.status });
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
            if (child == "details")         return details;
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

        if (window['PendingId'] && topic.id == PendingId)
        {   
            Topics.Open(topic, true);
            box.classList.add("active");
            PendingId = -1;
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
        result.innerHTML = marked.parse(string.replaceAll("\n", "\n\n"));

        const lists = result.content.querySelectorAll("li");
        for (const list of lists) {
            for (const child of list.childNodes) {
                if (child.nodeName == "P") {
                    list.innerHTML = child.innerHTML;
                }
            }
        }

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

    document.documentElement.setAttribute("doctitle", Courses.Active.name);
    Courses.PendingPrint = false;
}

window.onafterprint = function()
{
    document.documentElement.removeAttribute("doctitle");
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
    
    CheckAccent();
    CheckTheme();
    Courses.Pins.AppendSidebar();
})

marked.use(markedMoreLists());
marked.use({ extensions: [ mathBlockExtension, mathExtension ] });

if (document.documentElement.lang == "kr")
    moment.locale("ko");
else if (document.documentElement.lang == "jp")
    moment.locale("ja");
else
    moment.locale(document.documentElement.lang);


async function Image_Blur(src, blur = 20, width = 256, height = 256)
{
	return new Promise(resolve => 
	{
		let canvas = document.createElement("canvas");
		let ctx = canvas.getContext("2d");
	
			let draw = () => 
			{
				canvas.width = width;
				canvas.height = height;
	
				ctx.fillRect(0, 0, img.width, img.height);
				ctx.filter = "blur(" + blur + "px)";
				ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height); 
	
				canvas.toBlob(blob => 
				{
					let url = URL.createObjectURL(blob);
					resolve(url);
				}, "image/png"); 
			}
	
		let img = new Image();
		img.src = src;
		img.onload = draw;
	});
}

const Arrow = 
{
    Check: function(container)
    {
        const prev = [...container.parentNode.children].find(o => o.classList.contains("prev"));
        const next = [...container.parentNode.children].find(o => o.classList.contains("next"));

        if (container.scrollWidth > container.offsetWidth)
        {
            if (container.scrollLeft > 30)
                prev.classList.remove("hidden");
            else
                prev.classList.add("hidden");

            if (container.scrollLeft < container.scrollWidth - container.offsetWidth - 30)
                next.classList.remove("hidden");
            else
                next.classList.add("hidden");

            return;
        }

        prev.classList.add("hidden");
        next.classList.add("hidden");
    },
    Click: function(container, direction = "forward")
    {
        let scroll = container.offsetWidth;

        if (direction == "backward")
            scroll = scroll * -1;

        container.scrollLeft += scroll;
    }
}