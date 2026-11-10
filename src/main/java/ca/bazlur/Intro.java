package ca.bazlur;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class Intro {

    void main() {
        IO.println("1,000 requests, each waits 100 ms on the database");
        serve("50 platform threads", Executors.newFixedThreadPool(50));
        serve("virtual threads", Executors.newVirtualThreadPerTaskExecutor());
    }

    private void serve(String name, ExecutorService executor) {
        long start = System.nanoTime();
        try (executor) {
            for (int i = 0; i < 1_000; i++) {
                executor.submit(this::reserve);
            }
        }
        long millis = (System.nanoTime() - start) / 1_000_000;
        IO.println("%-20s %,6d ms".formatted(name, millis));
    }

    private String reserve() throws InterruptedException {
        Thread.sleep(100);
        return "confirmed";
    }
}
