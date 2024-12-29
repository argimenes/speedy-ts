### Select an entity (or range) plus all mentions

    SELECT id, name, array::distinct(
        (
            RETURN SELECT * FROM <-standoff_property_refers_to_agent<-StandoffProperty.text)
        ) AS mentions 
    FROM Agent 
    WHERE record::id(id) IN ["21671569-3eea-412b-85cc-08f659f58019","add92e01-cefe-4f13-94dd-f00eb82155b0"];

