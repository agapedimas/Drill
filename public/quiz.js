const Quiz = 
{
    Created: 0,
    Status: "",
    Problems: [],
    Done: false,
    Active: 
    {
        Number: -1,
        Problem: null,
        Choices: [],
        Chosen: -1
    },
    Open: async function(number)
    {
        Quiz.Active.Number = number;
        Quiz.Active.Problem = Quiz.Problems[number].question;
        Quiz.Active.Choices = Quiz.Problems[number].choices;

        for (let i = 0; i < Grid_ProblemNavigation.children.length; i++)
        {
            if (i == number)
                Grid_ProblemNavigation.children[i].classList.add("active");
            else
                Grid_ProblemNavigation.children[i].classList.remove("active");
        }

        Text_Question.innerHTML = await Problems.ParseMarkdownLatex(Quiz.Active.Problem);
        Grid_Choices.innerHTML = null;

        if (number == 0)
            Button_Prev.disabled = true;
        else
            Button_Prev.disabled = false;

        if (number == Quiz.Problems.length - 1)
            Button_Next.disabled = true;
        else
            Button_Next.disabled = false;

        for (let i = 0; i < Quiz.Active.Choices.length; i++)
        {   
            const choice = Quiz.Active.Choices[i];
            
            const text = document.createElement("div");
            text.classList.add("text");
            
            const box = document.createElement("div");
            box.classList.add("choice");
            box.classList.add("markdown");
            box.append(text);  

            if (Quiz.Done)
            {
                text.innerHTML = await Problems.ParseMarkdownLatex(choice.text);
                const reason = document.createElement("div");
                reason.classList.add("reason");

                if (Quiz.Problems[number].chosen == i)
                {
                    if (Quiz.Problems[number].isCorrect == false)
                        box.classList.add("wrong");
                    else
                        box.classList.add("correct");

                    box.classList.add("chosen");
                    box.appendChild(reason);
                    reason.innerHTML = await Problems.ParseMarkdownLatex(choice.explaination.replaceAll("\\\$", "$"));
                }
                else
                {
                    if (Quiz.Problems[number].isCorrect == false && choice.correct) 
                    {
                        box.classList.add("correct");
                        reason.innerHTML = await Problems.ParseMarkdownLatex(choice.explaination.replaceAll("\\\$", "$"));
                        box.appendChild(reason);
                    }
                }
            }
            else
            {
                text.innerHTML = await Problems.ParseMarkdownLatex(choice);
                box.onclick = function()
                {
                    if (box.classList.contains("active"))
                        Answer_Choose(-1);
                    else
                        Answer_Choose(i);
                }
            }
            Grid_Choices.append(box);
        }

        Answer_Choose(Quiz.Problems[number].chosen);

        function Answer_Choose(index)
        {
            Quiz.Problems[number].chosen = index;

            for (let i = 0; i < Grid_Choices.children.length; i++)
                if (i == Quiz.Problems[number].chosen)
                    Grid_Choices.children[i].classList.add("active");
                else
                    Grid_Choices.children[i].classList.remove("active");

            if (index != 0 && !index || index <= -1)
                Grid_ProblemNavigation.children[number].classList.remove("chosen");
            else
                Grid_ProblemNavigation.children[number].classList.add("chosen");
        }

        Content_Quiz.parentNode.scrollTop = 0;
    },
    Back: function(origin = "")
    {
        if (document.referrer)
        {
            const urlPrev = new URL(document.referrer);
            const urlNow = new URL(location.href);

            if (urlPrev.origin == urlNow.origin && window.history.length > 2)
            {
                if (urlPrev.pathname.startsWith(origin + "/courses") || urlPrev.pathname.startsWith(origin + "/mentor/"))
                {
                    return window.history.back();
                }
            }
        }

        window.location.href = origin + "/courses/";
    }
}

const Data = 
{
    Get: function(id)
    {   
        if (localStorage.getItem("quizzes") == null)
            localStorage.setItem("quizzes", "[]");

        let data = localStorage.getItem("quizzes");
        data = JSON.parse(data);

        if (id)
            return data.find(o => o.id == id);
        else
            return data;
    },
    Set: function(id, value)
    {   
        const data = Data.Get();
        const row = data.find(o => o.id == id);

        if (row)
            row.value = value;
        else
            data.push({ id, value });

        localStorage.setItem("quizzes", JSON.stringify(data));
    }
}

const a = Courses.Render;
const b = Topics.Append;
const c = Topics.Render;

Courses.Render = function(course)
{
    const box = a(course);
    box.find("hover").remove();
    box.find("banner").remove();
    box.find("description").remove();
    box.removeAttribute("goto");
    box.oncontextmenu = null;
    box.onclick = async function()
    {
        if (Topics.Request)
            Topics.Request.abort();

        Activity_SelectTopics.sections[1].name = course.name;
        Activity_SelectTopics.navigateTo(1);
        PendingId = null;
        Grid_CourseTopics.innerHTML = "<div class='progressring'></div";
        Topics.Request = $.ajax({
            type: "get",
            url: "/topics/get/" + course.id + "?type=course",
            success: function(topics)
            {
                Topics.Request = null;
                Grid_CourseTopics.innerHTML = "";
                Topics.Append(topics, Grid_CourseTopics);
            }
        });
    }
    return box;
}
Topics.Append = function(topics, container)
{
    for (const topic of topics)
        container.append(Topics.Render(topic));
}
Topics.Render = function(topic)
{
    const box = document.createElement("div");
    box.classList.add("topic");
    box.append(topic.name);
    box.onclick = function()
    {                
        const url = new URL(window.location.href);
        url.searchParams.set("name", topic.name);
        const name = url.search.replace("?name=", "").replaceAll("+", "-").replaceAll("---", "-").toLowerCase();
        window.location.replace("/mentor/" + topic.course + "/" + name);
        PopOver_SelectTopics.close();
    }
    return box;
}

$.ajax(
{
    type: "get",
    url: "/courses/get",
    success: function(courses)
    {
        Courses.Sort = ["default", "asc"];
        Courses.List = courses;
        Courses.Append(courses, Grid_Courses);

        const semesters = [...["<$ courses filter_all />"],...new Set(courses.map(o => o.semester))];
        const context = Components.ContextMenu.List.find(o => o.id == "Courses");

        for (const semester of semesters.reverse())
        {
            context.commands.unshift(
                {
                    value: semester,
                    Checked: false,
                    Title: semester == "<$ courses filter_all />" ? semester : "<$ courses filter_semester />".format(semester),
                    Action: o => Filter_Change(semester)
                }
            );
        }

        Filter_Change("<$ courses filter_all />");
    }
});

Button_Cancel.onclick = function()
{
    PopOver_SelectTopics.close();
}

PopOver_SelectTopics.onclosed = function()
{
    Activity_SelectTopics.navigateTo(0, true);
    Grid_CourseTopics.innerHTML = null;
}
   
function Filter_Change(value)
{
    const context = Components.ContextMenu.List.find(o => o.id == "Courses");
    for (const item of context.commands)
    {
        if (item.value == value)
            item.Checked = true;
        else
            item.Checked = false;
    }
    
    for (const child of [...Grid_Courses.children])
    {
        if (child.data.semester != value && value != "<$ courses filter_all />")
            child.style.display = "none";
        else
            child.style.display = "";
    }
    
    Activity_Main.scrollTop = 0;
}

function Sort_Change(value)
{
    if (Courses.Sort[0] == value)
    {
        if (Courses.Sort[1] == "asc")
            Courses.Sort[1] = "desc";
        else
            Courses.Sort[1] = "asc";
    }
    else
    {
        Courses.Sort[0] = value;
        Courses.Sort[1] = "asc";
    }

    const context = Components.ContextMenu.List.find(o => o.id == "Courses");
    for (const item of context.commands[context.commands.length - 1].Submenu)
    {
        if (item.value == value)
        {
            item.Checked = true;
            item.Icon = value == "default" ? null : Courses.Sort[1] == "asc" ? "ebd7" : "eb26";
        }
        else
        {
            item.Checked = false;
            item.Icon = null;
        }
    }

    let children = [...Grid_Courses.children];
    
    if (value == "default")
    {
        const orderMap = new Map();
        Courses.List.forEach((course, index) => 
        {
            orderMap.set(course.name, index);
        });

        children.sort((a, b) => 
        {
            const aIndex = orderMap.get(a.data.name) ?? Infinity;
            const bIndex = orderMap.get(b.data.name) ?? Infinity;

            return aIndex - bIndex;
        });
    }
    else
    {
        children = children.sort(function(a,b)
        {
            const aVal = a.data[value];
            const bVal = b.data[value];

            if (typeof aVal === "string" && typeof bVal === "string")
            {
                if (Courses.Sort[1] == "asc")
                    return aVal.localeCompare(bVal);
                else
                    return bVal.localeCompare(aVal);
            }

            if (Courses.Sort[1] == "asc")
                return aVal - bVal;
            else
                return bVal - aVal;
        });
    }

    children.forEach(o => Grid_Courses.append(o));
    Activity_Main.scrollTop = 0;
}

Button_Filter.onclick = function(event)
{
    Components.ContextMenu.Open("Courses", this, event);
};