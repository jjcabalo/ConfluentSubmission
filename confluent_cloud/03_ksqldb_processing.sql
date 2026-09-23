-- table for high-risk orders
CREATE TABLE fraudulent_orders (
    order_id STRING,
    user_id STRING,
    amount DOUBLE,
    alert_reason STRING
);

-- actively monitor and route fraud
INSERT INTO fraudulent_orders
SELECT 
    order_id,
    user_id,
    amount,
    'High Value Fraud Risk' AS alert_reason
FROM raw_orders
WHERE amount > 1000.0;

-- table for safe orders
CREATE TABLE valid_orders (
    order_id STRING,
    user_id STRING,
    amount DOUBLE
);

-- push safe orders downstream
INSERT INTO valid_orders
SELECT 
    order_id,
    user_id,
    amount
FROM raw_orders
WHERE amount <= 1000.0;
