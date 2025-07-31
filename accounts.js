const SQL = require("./sql");

const Accounts = 
{
    /**
     * @param { {
     *      id: string?,
     *      username: string?,
     *      role: string?
     * } } details Details of account by id, username, or role
     * @returns { Promise<Array<{
     *      id: string,
     *      username: string,
     *      nickname: string,
     *      url: string,
     *      created: string,
     *      role: string
     * }>> } Details of accounts 
     */
    Get: async function(details)
    {
        let query = "SELECT id, username, nickname, url, created, role FROM accounts";
        let params = [];

        if (details?.id)
        {
            query += " WHERE id=?";
            params.push(details.id);
        }
        else if (details?.username)
        {
            query += " WHERE username=?";
            params.push(details.username);  
        }
        else if (details?.role)
        {
            query += " WHERE role=?";
            params.push(details.role);  
        }

        const results = await SQL.Query(query, [params]);            
        return results.data || [];
    }
};

module.exports = Accounts;