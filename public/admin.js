Components.ContextMenu.Add("Course_Admin", 
    [
        {
            Title: "<$ courses newtab />",
            Icon: "fbc1",
            Action: (element) => { window.open("/admin/courses/" + element.data.id) }
        }
    ]);

Components.ContextMenu.Add("Topic_Admin", 
    [
        {
            Title: "<$ generic rename />",
            Icon: "eef7",
            Action: (element) => 
            { 
                Input_TopicNameRename.focus();
                PopOver_RenameTopic.element = element;
                PopOver_RenameTopic.open(element);
                Input_TopicNameRename.value = element.data.name;
            }
        },
        "separator",
        {
            Title: "<$ generic delete />",
            Show: ActiveUser.role == "admin",
            Icon: "fd3c",
            Type: "critical",
            Action: (element) => 
            {
                Components.ActionSheet.Open(
                {
                    Title: "<$ topics delete_confirm_title />".format(element.data.name),
                    Description: "<$ topics delete_confirm_message />",
                    Actions: [
                        { 
                            Title: "<$ generic delete />", Type: "Options.Critical", 
                            Action: function() 
                            {   
                                return new Promise(function(resolve)
                                {
                                    $.ajax({
                                        type: "delete",
                                        url: "/admin/topics/delete", 
                                        data: { id: element.data.id }, 
                                        success: function()
                                        {
                                            Topics.Back();
                                            element.remove();
                                            resolve();
                                        },
                                        error: function(error)
                                        {
                                            resolve();
                                            Components.Notification.Send({ Id: "delete_failed", Title: "<$ topics delete_error_title />", Message: error.responseText || "<$ topics error_generic />", Icon: "\ufe60", Buttons: [{Text: "<$ generic dismiss />"}] });
                                        }
                                    });
                                })
                            }
                        },
                        { 
                            Title: "<$ generic cancel />", Type: "Footer"
                        }
                    ]
                });    
            }
        }
    ]);

Components.ContextMenu.Add("Problem_Admin", 
    [
        {
            Title: "<$ generic edit />",
            Icon: "f7cf",
            Action: async (element) => 
            { 
                Pivot_Problem.tabs.selected = 0;
                Input_ProblemYearEdit.value = element.data.year;
                Input_ProblemTextEdit.value = element.data.question;
                Grid_ProblemPreviewEdit.innerHTML = await Problems.ParseMarkdownLatex(element.data.question);
                Input_ProblemTextEdit.focus();
                Input_ProblemTextEdit.scrollTop = 0;
                PopOver_EditProblem.element = element;
                PopOver_EditProblem.open();
                await Select_Fetch();
                Select_ProblemSourceEdit.value = element.data.source.id;
                Inputs_CheckEdit();
            }
        },
        {
            Title: "<$ problems move_title />",
            Icon: "f2ed",
            Type: "",
            Action: async (element) => 
            { 
                const topics = [...Grid_CourseTopics.children].map(o => o.data);
                Grid_MoveCourseTopics.innerHTML = null;

                for (const topic of topics)
                {
                    if (topic.id == Topics.Active.id)
                        continue;

                    const box = Topics.Render(topic);
                    box.draggable = false;
                    box.oncontextmenu = null;
                    box.onclick = async function()
                    {
                        $.ajax(
                        {
                            type: "patch",
                            url: "/admin/problems/move",
                            data: {
                                id: element.data.id,
                                topic: topic.id
                            },
                            success: async function()
                            {
                                if (element.parentNode.children.length == 2)
                                    element.parentNode.remove();
                                else
                                    element.remove();
                                
                                const oldActive = Topics.Active;
                                Topics.Active  = topic;
                                await UpdateTopicDetails();
                                
                                for (const box of [...Grid_CourseTopics.children])
                                    box.classList.remove("active");

                                Topics.Active = oldActive;
                                await UpdateTopicDetails();

                                PopOver_MoveProblem.close();
                            },
                            error: function()
                            {
                                Components.Notification.Send({ Id: "move_failed", Title: "<$ problems move_error_title />", Message: error.responseText || "<$ problems error_generic />", Icon: "\ufe60", Buttons: [{Text: "<$ generic dismiss />"}] });
                            }
                        });
                    }
                    Grid_MoveCourseTopics.append(box);
                }

                PopOver_MoveProblem.open();
            }
        },
        "separator",
        {
            Title: "<$ generic delete />",
            Icon: "fd3c",
            Type: "critical",
            Action: (element) => 
            {
                Components.ActionSheet.Open(
                {
                    Title: "<$ problems delete_confirm_title />",
                    Description: "<$ problems delete_confirm_message />",
                    Actions: [
                        { 
                            Title: "<$ generic delete />", Type: "Options.Critical", 
                            Action: function() 
                            {
                                return new Promise(function(resolve)
                                {
                                    $.ajax({
                                        type: "delete",
                                        url: "/admin/problems/delete", 
                                        data: { id: element.data.id }, 
                                        success: function()
                                        {
                                            if (element.parentNode.children.length == 2)
                                                element.parentNode.remove();
                                            else
                                                element.remove();
                                            
                                            UpdateTopicDetails();
                                            resolve();
                                        }, 
                                        error: function(error)
                                        {
                                            resolve();
                                            Components.Notification.Send({ Id: "delete_failed", Title: "<$ problems delete_error_title />", Message: error.responseText || "<$ problems error_generic />", Icon: "\ufe60", Buttons: [{Text: "<$ generic dismiss />"}] });
                                        }
                                    });
                                })
                            }
                        },
                        { 
                            Title: "<$ generic cancel />", Type: "Footer"
                        }
                    ]
                });    
            }
        }
    ]);

Components.ContextMenu.Add("Accounts", 
[
    {
        Title: "<$ generic delete />",
        Show: ActiveUser.role == "admin",
        Icon: "fd3c",
        Type: "critical",
        Action: (element) => 
        {
            Components.ActionSheet.Open(
            {
                Title: "<$ accounts delete_account_confirm_title />",
                Description: "<$ accounts delete_account_confirm_message />",
                Actions: [
                    { 
                        Title: "<$ generic delete />", Type: "Options.Critical", 
                        Action: function() 
                        {
                            return new Promise(function(resolve)
                            {
                                $.ajax({
                                    type: "delete",
                                    url: "/accounts/delete", 
                                    data: { id: element.data.id }, 
                                    success: function()
                                    {
                                        element.remove();
                                        resolve();
                                    }, 
                                    error: function(error)
                                    {
                                        resolve();
                                        Components.Notification.Send({ Id: "delete_failed", Title: "<$ accounts delete_error_title />", Message: error.responseText || "<$ settings error_generic />", Icon: "\ufe60", Buttons: [{Text: "<$ generic dismiss />"}] });
                                    }
                                });
                            })
                        }
                    },
                    { 
                        Title: "<$ generic cancel />", Type: "Footer"
                    }
                ]
            });    
        }
    }
]);

function Select_Fetch()
{
    return new Promise(function(resolve)
    {
        if (Select_ProblemSource.children.length == 0)
        {
            $.ajax({
                type: "get",
                url: "/sources/get",
                success: function(sources)
                {
                    for (const source of sources)
                    {
                        const name = JSON.parse(`<$ problems sources />`)[source.id];

                        const option1 = document.createElement("option");
                        option1.append(name);
                        option1.value = source.id;
                        option1.name = name;

                        const option2 = document.createElement("option");
                        option2.append(name);
                        option2.value = source.id;
                        option2.name = name;

                        Select_ProblemSource.append(option1);
                        Select_ProblemSourceEdit.append(option2);
                    }

                    return resolve();
                }
            });
        }
        else
        {
            return resolve();
        }
    });
}