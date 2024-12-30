### Select an entity (or range) plus all mentions

    SELECT id, name, array::distinct(
        (
            RETURN SELECT * FROM <-standoff_property_refers_to_agent<-StandoffProperty.text)
        ) AS mentions 
    FROM Agent 
    WHERE record::id(id) IN ["21671569-3eea-412b-85cc-08f659f58019","add92e01-cefe-4f13-94dd-f00eb82155b0"];

### Fetch all mentions and include a count of their frequency (for the alias search)

    SELECT id,
        name,
        (
            SELECT 
                text,
                count() as count
            FROM <-standoff_property_refers_to_agent<-StandoffProperty
            GROUP BY text
            ORDER BY count DESC
        ) AS mentions
    FROM Agent 
    WHERE name CONTAINS $text

### Reverse entity lookup, i.e., query by alias

    SELECT text, count, { id: out.id, name: out.name } as agent FROM (
        SELECT in.text as text, out, count()
        FROM standoff_property_refers_to_agent  
        WHERE in.text CONTAINS "citizen"
        GROUP BY in.text, out
        ORDER BY in.text, count DESC
    )