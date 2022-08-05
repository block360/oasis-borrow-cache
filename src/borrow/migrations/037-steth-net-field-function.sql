TRUNCATE TABLE aave.reserve_data_updated

ALTER TABLE aave.reserve_data_updated ADD COLUMN reserve varchar
(50) not null;

DELETE FROM vulcan2x.job WHERE name LIKE 'aave-lending-pool-transformer%';

CREATE INDEX vulcan2x_block_timestamp_index ON vulcan2x.block (timestamp);

create or replace function api.aave_yield_rate_steth_eth
(start_date date, end_date date, multiple decimal) 
returns decimal
language sql
as
$$

with
    reward_apr
    as
    (

        select
            date_trunc('day',b.timestamp at time zone 'utc') as date,
            (post_total_pooled_ether - pre_total_pooled_ether) * 365 * 24 * 60 * 60 /
       (pre_total_pooled_ether * time_elapsed) * 100 * 0.9 as current_steth_reward_apr
        from lido.post_total_shares lpts
            join vulcan2x.block b on lpts.block_id = b.id
        order by timestamp desc

    ),


    borrow_rates
    as
    (

        select avg(stable_borrow_rate) / 1e27 * 100 as stable_borrow_rate, avg(variable_borrow_rate) * 100 / 1e27 as variable_borrow_rate,

            date_trunc('day', b.timestamp at time zone 'utc') as date

        from aave.reserve_data_updated rdu
            join vulcan2x.block b on rdu.block_id = b.id
        where rdu.reserve = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

        group by date
        order by date desc
    )


select avg(current_steth_reward_apr * multiple - variable_borrow_rate * (multiple - 1)) AS net_annualised_yield
from
    borrow_rates br
    join reward_apr ra on br.date = ra.date
where br.date >= start_date and br.date <= end_date
$$;
