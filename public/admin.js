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
                PopOver_RenameTopic.Open(element);
                Input_TopicNameRename.value = element.data.name;
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
                    Title: "Are you sure want to delete topic \n'" + element.data.name + "'?",
                    Description: "All problems and its solution will also be deleted. This action cannot be undone.",
                    Actions: [
                        { 
                            Title: "Delete", Type: "Options.Critical", 
                            Action: o => 
                            {
                                $.ajax({
                                    type: "delete",
                                    url: "/admin/topics/delete", 
                                    data: { id: element.data.id }, 
                                    success: function()
                                    {
                                        Topics.Back();
                                        element.remove();
                                    }
                                });
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
            Action: (element) => 
            { 
                Pivot_Problem.Tabs.Selected = 0;
                Select_ProblemSourceEdit.value = element.data.source.id;
                Input_ProblemYearEdit.value = element.data.year;
                Input_ProblemTextEdit.value = element.data.question;
                Grid_ProblemPreviewEdit.innerHTML = marked.parse(element.data.question);
                Input_ProblemTextEdit.focus();
                PopOver_EditProblem.element = element;
                PopOver_EditProblem.Open();
                Select_Fetch();
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
                            Action: o => 
                            {
                                $.ajax({
                                    type: "delete",
                                    url: "/admin/problems/delete", 
                                    data: { id: element.data.id }, 
                                    success: function()
                                    {
                                        element.remove();
                                    }
                                });
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