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
    WHERE record::id(id) IN [
        "21671569-3eea-412b-85cc-08f659f58019",
        "add92e01-cefe-4f13-94dd-f00eb82155b0","0090151c-4cb3-415b-afb2-e7f0fd27cd2a",
        "002edabe-d5b4-4ed3-809d-a4f936694e0f","4d9da495-e794-463f-a78e-8b9570674e05",
        "4e92650a-b925-4a33-bcb5-0d64bd88cf2b", "5d9cbd12-a35b-4b1c-9130-36c6786145b2"
    ];

