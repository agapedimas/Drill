const SQL = require("./sql");
const FileIO = require("fs");

const Courses = 
{
    /**
     * Get courses details
     * @param { string? } id Id of course
     * @returns { Promise<Array<{
     *      id: string,
     *      name: string,
     *      alias: string,
     *      description: string,
     *      semester: number,
     *      sks: number,
     *      bannerversion: number
     * }>>} List of courses
     */
    Get: async function(id)
    {
        let query = "SELECT * FROM courses";
        let params = [];

        if (id)
        {
            query += " WHERE id=?";
            params.push(id);
        }

        query += " ORDER BY semester ASC, name ASC"

        const results = await SQL.Query(query, params);
        return results.data || [];
    },
    /**
     * Add new course along its details
     * @param { string } id Id of course
     * @param { string } name Name of course
     * @param { string? } alias Alias of course
     * @param { string? } description Description of course
     * @param { number } semester Semester of course
     * @param { number } sks SKS of course
     * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
     */
    Add: async function(id, name, alias, description, semester, sks)
    {
        id = id.replace(/([^A-Za-z0-9\-\_])/gi, "");

        const result = await SQL.Query(
            "INSERT INTO courses (id, name, alias, description, semester, sks) VALUES (?, ?, ?, ?, ?, ?)", 
            [id, name, alias || null, description || null, semester, sks]
        );
        
        return result.success;
    },
    /**
     * Update existing course
     * @param { string } id Original id of course
     * @param { string? } newId Change id of course
     * @param { string? } name Name of course
     * @param { string? } alias Alias of course
     * @param { string? } description Description of course
     * @param { number? } semester Semester of course
     * @param { number? } sks SKS of course
     * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
     */
    Update: async function(id, newid, name, alias, description, semester, sks)
    {
        const keys = [];
        const values = [];

        if (newid)
        {
            newid = newid.replace(/([^A-Za-z0-9\-\_])/gi, "");
            keys.push("id");
            values.push(newid);
        }
        if (name)
        {
            keys.push("name");
            values.push(name);
        }
        if (alias)
        {
            keys.push("alias");
            values.push(alias);
        }
        if (description)
        {
            keys.push("description");
            values.push(description);
        }
        if (semester)
        {
            keys.push("semester");
            values.push(parseInt(semester));
        }
        if (sks)
        {
            keys.push("sks");
            values.push(parseInt(sks));
        }

        if (keys.length == 0)
            return true;

        for (let i = 0; i < values.length; i++)
            if (values[i] == "@null")
                values[i] = null;

        const result = await SQL.Query(
            "UPDATE courses SET " + keys.map(o => o + "=?").join(", ") + " WHERE id=?", 
            [...values,id]
        );
        
        return result.success;
    },
    /**
     * Delete course
     * @param { string } id Id of course
     * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
     */
    Remove: async function(id)
    {
        if (id == null)
            return false;

        const result1 = await Courses.Banners.Delete(id);
        const result2 = await SQL.Query("DELETE FROM courses WHERE id=?", id);

        return result1.success && result2;
    },
    Topics:
    {
        /**
         * Get topics details
         * @param { {
         *      topic: string?,
         *      course: string?
         * } } id Id of topic or course
         * @returns { Promise<Array<{
         *      id: string,
         *      name: string,
         *      course: string,
         *      problemcount: number,
         *      lastedited: number
         * }>>} List of topics
         */
        Get: async function(id)
        {
            let query = "SELECT id, name, course, problemcount, lastedited FROM topics"
            let params = [];

            if (id.topic)
            {
                query += " WHERE id=?";    
                params.push(id.topic);
            }
            else if (id.course)
            {
                query += " WHERE course=?";    
                params.push(id.course);
            }

            query += " ORDER BY sort";

            const results = await SQL.Query(query, params);
            return results.data || [];
        },
        /**
         * Search topic's id by name
         * @param { string } course Id of course
         * @param { string } query Query by name of topic
         * @returns { Promise<string> } Id of topic
         */
        Find: async function(course, query)
        {
            const result = await SQL.Query("SELECT id FROM topics WHERE LOWER(name) LIKE LOWER(?) AND course=?", [query.replaceAll(" ", "%"), course]);
            return result.data[0]?.id;
        },
        /**
         * Add new topic along its details
         * @param { string } name Name of topic
         * @param { string } course Id of course
         * @returns { Promise<string> } Id of topic
         */
        Add: async function(name, course)
        {
            const result = await SQL.Query(
                `INSERT INTO topics 
                    (name, course, sort) 
                    SELECT ?, ?,  COALESCE(MAX(sort), 0) + 1 
                FROM topics WHERE course = ?
                `, 
                [name, course, course]
            );

            return result.data?.insertId;
        },
        /**
         * Update existing topic
         * @param { string } id Id of topic
         * @param { string } name Name of topic
         * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
         */
        Update: async function(id, name)
        {
            if (id == null || name == null)
                return false;

            const result = await SQL.Query(
                "UPDATE topics SET name=? WHERE id=?", 
                [name, id]
            );
            
            return result.success;
        },
        /**
         * Reorder existing topic
         * @param { string } id Id of topic
         * @param { number } sort Index of topic
         * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
         */
        Reorder: async function(id, sort)
        {
            const query = `
                SET @id = ?;
                SET @new_sort = ?;

                SELECT sort, course INTO @old_sort, @course FROM topics WHERE id = @id;

                UPDATE topics
                SET sort = 0
                WHERE id = @id;

                UPDATE topics
                SET sort = CASE
                    WHEN @old_sort > @new_sort THEN sort + 1
                    WHEN @old_sort < @new_sort THEN sort - 1
                    ELSE sort
                END
                WHERE course = @course
                AND sort BETWEEN LEAST(@old_sort, @new_sort) AND GREATEST(@old_sort, @new_sort)
                AND id != @id;

                UPDATE topics
                SET sort = @new_sort
                WHERE id = @id;
                `;
            const result = await SQL.Query(query, [id, sort]);
            return result.success;
        },
        /**
         * Delete topic
         * @param { string } id Id of topic
         * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
         */
        Remove: async function(id)
        {
            if (id == null)
                return false;

            const result = await SQL.Query("DELETE FROM topics WHERE id=?", id);
            return result.success;
        }
    },
    Problems: 
    {
        /**
         * Get problems details
         * @param { {
         *      problem: string?,
         *      course: string?,
         *      topic: string?
         * } } id Id of problem, course, or topic
         * @returns { Promise<Array<{
         *      id: string,
         *      question: string,
         *      solution?: string,
         *      source: {
         *          id: number,
         *          name: string
         *      },
         *      year: number,
         *      course: string,
         *      topic: string,
         *      timeadded: string,
         *      lastedited: string,
         * }>>} List of problems
         */
        Get: async function(id)
        {
            let query = `
                SELECT 
                    p.id, 
                    p.question, 
                    p.solution, 
                    JSON_OBJECT('id', s.id, 'name', s.name) AS source, 
                    p.year, 
                    p.course, 
                    p.topic, 
                    p.timeadded, 
                    p.lastedited
                FROM problems p
                LEFT JOIN problem_sources s ON p.source = s.id
            `;
            let params = [];

            if (id.problem)
            {
                query += " WHERE p.id=?";    
                params.push(id.problem);
            }
            else if (id.course)
            {
                query += " WHERE p.course=?";    
                params.push(id.course);
            }
            else if (id.topic)
            {
                query += " WHERE p.topic=?";    
                params.push(id.topic);
            }
            else
                return [];

            query += " ORDER BY p.year DESC, s.id DESC";

            const results = await SQL.Query(query, params);
            return results.data || [];
        },
        /**
         * Add new problem along its details
         * @param { string } question Text of problem
         * @param { solution? } solution Solution of problem
         * @param { int } source Id of source of problem
         * @param { int } year Year of source of problem
         * @param { int } topic Id of topic of problem
         * @param { string } course Id of course of problem
         * @returns { Promise<string> } Id of problem
         */
        Add: async function(question, solution, source, year, topic, course)
        {
            const result = await SQL.Query("INSERT INTO problems (question, solution, source, year, topic, course, timeadded, lastedited) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [question, solution, source, year, topic, course, Date.now(), Date.now()]);
            return result.data?.insertId;
        },
        /**
         * Update existing problem
         * @param { string } id Original id of problem
         * @param { string? } question Text of problem
         * @param { solution? } solution Solution of problem
         * @param { int? } source Id of source of problem
         * @param { int? } year Year of source of problem
         * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
         */
        Update: async function(id, question, solution, source, year)
        {
            const keys = [];
            const values = [];

            if (question)
            {
                keys.push("question");
                values.push(question);
            }
            if (solution)
            {
                keys.push("solution");
                values.push(solution);
            }
            if (source)
            {
                keys.push("source");
                values.push(source);
            }
            if (year)
            {
                keys.push("year");
                values.push(parseInt(year));
            }

            if (keys.length == 0)
                return true;

            for (let i = 0; i < values.length; i++)
                if (values[i] == "@null")
                    values[i] = null;

            const result = await SQL.Query(
                "UPDATE problems SET " + keys.map(o => o + "=?").join(", ") + ", lastedited=? WHERE id=?", 
                [...values, Date.now(), id]
            );

            return result.success;
        },
        /**
         * Delete problem
         * @param { int } Id Id of problem
         * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
         */
        Remove: async function(id)
        {
            const result = await SQL.Query("DELETE FROM problems WHERE id=?", [id]);
            return result.success;
        },
        Sources: 
        {
            /**
             * Get all type of sources of problem
             * @returns { Promise<Array<{
             *      id: number,
             *      name: string
             * }>> }
             */
            Get: async function()
            {
                const result = await SQL.Query("SELECT * FROM problem_sources ORDER BY id");
                return result.data || [];
            },
            /**
             * Add source type of problem
             * @param { string } name Name of source
             * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
             */
            Add: async function(name)
            {
                const result = await SQL.Query("INSERT INTO problem_sources (name) VALUES (?)", [name]);
                return result.success;
            },
            /**
             * Update source type of problem
             * @param { number } id Id of source
             * @param { string } name Name of source
             * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
             */
            Update: async function(id, name)
            {
                const result = await SQL.Query("UPDATE problem_sources SET name=? WHERE id=?", [name, id]);
                return result.success;
            },
            /**
             * Delete source type of problem
             * @param { number } id Name of source
             * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
             */
            Remove: async function(id)
            {
                const result = await SQL.Query("DELETE FROM problem_sources WHERE id=?", [id]);
                return result.success;
            }
        }
    },
    Banners: 
    {
        /**
         * Save banner of course
         * @param { string } id Id of course 
         * @param { Array<Buffer> } buffer Buffer of image
         * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
         */
        Save: async function(id, buffer)
        {
            try
            {
                const path = "./src/banners/" + id;
                FileIO.writeFileSync(path, buffer);
                await SQL.Query("UPDATE courses SET bannerversion = bannerversion + 1 WHERE id = ?", [id]);
                return true;
            }
            catch(error)
            {
                console.error(error);
                return false;
            }
        },
        /**
         * Delete banner of course
         * @param { string } id Id of course 
         * @returns { Promise<boolean> } @true if operation completed successfully, otherwise @false
         */
        Delete: async function(id)
        {
            try
            {
                const path = "./src/banners/" + id;
                
                if (FileIO.existsSync(path))
                    FileIO.unlinkSync(path);

                await SQL.Query("UPDATE courses SET bannerversion = bannerversion + 1 WHERE id = ?", [id]);

                return true;
            }
            catch(error)
            {
                console.error(error);
                return false;
            }
        }
    }
}

module.exports = Courses;