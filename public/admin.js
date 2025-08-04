Components.ContextMenu.Add("Course_Admin", 
    [
        {
            Title: "Open in new tab",
            Icon: "fbc1",
            Action: (element) => { window.open("/admin/courses/" + element.data.id) }
        }
    ]);

Components.ContextMenu.Add("Topic_Admin", 
    [
        {
            Title: "Rename",
            Icon: "eef7",
            Action: (element) => 
            { 
                Input_TopicNameRename.focus();
                PopOver_RenameTopic.element = element;
                PopOver_RenameTopic.open(element);
                Input_TopicNameRename.value = element.data.name;
            }
        },
        {
            Title: "Delete",
            Show: ActiveUser.role == "admin",
            Icon: "fd3c",
            Type: "critical",
            Action: (element) => 
            {
                Components.ActionSheet.Open(
                {
                    Title: "Are you sure want to delete topic \n'" + element.data.name + "'?",
                    Description: "All problems and its solution will also be deleted. This action cannot be undone.",
                    Actions: [
                        { 
                            Title: "Delete", Type: "Options.Critical", 
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
                                            Components.Notification.Send({ Id: "delete_failed", Title: "Unable to Delete", Message: error.responseText || "Something went wrong.", Icon: "\ufe60", Buttons: [{Text: "Dismiss"}] });
                                        }
                                    });
                                })
                            }
                        },
                        { 
                            Title: "Cancel", Type: "Footer"
                        }
                    ]
                });    
            }
        }
    ]);

Components.ContextMenu.Add("Problem_Admin", 
    [
        {
            Title: "Edit",
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
            }
        },
        {
            Title: "Delete",
            Icon: "fd3c",
            Type: "critical",
            Action: (element) => 
            {
                Components.ActionSheet.Open(
                {
                    Title: "Are you sure want to delete this problem?",
                    Description: "Its solution will also be deleted. This action cannot be undone.",
                    Actions: [
                        { 
                            Title: "Delete", Type: "Options.Critical", 
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
                                            element.remove();
                                            resolve();
                                        }, 
                                        error: function(error)
                                        {
                                            resolve();
                                            Components.Notification.Send({ Id: "delete_failed", Title: "Unable to Delete", Message: error.responseText || "Something went wrong.", Icon: "\ufe60", Buttons: [{Text: "Dismiss"}] });
                                        }
                                    });
                                })
                            }
                        },
                        { 
                            Title: "Cancel", Type: "Footer"
                        }
                    ]
                });    
            }
        }
    ]);

Components.ContextMenu.Add("Accounts", 
[
    {
        Title: "Delete",
        Show: ActiveUser.role == "admin",
        Icon: "fd3c",
        Type: "critical",
        Action: (element) => 
        {
            Components.ActionSheet.Open(
            {
                Title: "Are you sure want to delete this account?",
                Description: "This will remove their access, but their created courses, topics, and problems will still be available.",
                Actions: [
                    { 
                        Title: "Delete", Type: "Options.Critical", 
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
                                        Components.Notification.Send({ Id: "delete_failed", Title: "Unable to Delete", Message: error.responseText || "Something went wrong.", Icon: "\ufe60", Buttons: [{Text: "Dismiss"}] });
                                    }
                                });
                            })
                        }
                    },
                    { 
                        Title: "Cancel", Type: "Footer"
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
                        const option1 = document.createElement("option");
                        option1.append(source.name);
                        option1.value = source.id;
                        option1.name = source.name;

                        const option2 = document.createElement("option");
                        option2.append(source.name);
                        option2.value = source.id;
                        option2.name = source.name;

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