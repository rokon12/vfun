package ca.bazlur.contention;

import java.util.concurrent.Executors;

public class PinningProbe {

    void main() {
        long start = System.nanoTime();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 20; i++) {
                Object lock = new Object();
                executor.submit(() -> {
                    synchronized (lock) {
                        Thread.sleep(100);
                    }
                    return null;
                });
            }
        }
        long millis = (System.nanoTime() - start) / 1_000_000;
        IO.println("JDK %d: 20 tasks, each sleeps 100 ms under its own lock: %,d ms"
                .formatted(Runtime.version().feature(), millis));
    }
}
