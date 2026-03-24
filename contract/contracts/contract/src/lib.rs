#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Symbol, String, Vec, Address, Map};

#[derive(Clone)]
#[contract]
pub struct NewsContract;

#[contractimpl]
impl NewsContract {

    // Add news
    pub fn publish_news(env: Env, author: Address, content: String) -> u32 {
        author.require_auth();

        let mut news_count: u32 = env.storage().instance().get(&Symbol::short("COUNT")).unwrap_or(0);

        let news_id = news_count + 1;

        let mut news_map: Map<u32, (Address, String)> =
            env.storage().instance().get(&Symbol::short("NEWS")).unwrap_or(Map::new(&env));

        news_map.set(news_id, (author, content));

        env.storage().instance().set(&Symbol::short("NEWS"), &news_map);
        env.storage().instance().set(&Symbol::short("COUNT"), &news_id);

        news_id
    }

    // Get news by ID
    pub fn get_news(env: Env, news_id: u32) -> (Address, String) {
        let news_map: Map<u32, (Address, String)> =
            env.storage().instance().get(&Symbol::short("NEWS")).unwrap();

        news_map.get(news_id).unwrap()
    }

    // Get total count
    pub fn total_news(env: Env) -> u32 {
        env.storage().instance().get(&Symbol::short("COUNT")).unwrap_or(0)
    }
}